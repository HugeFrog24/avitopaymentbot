import { Decimal } from "@prisma/client/runtime/client"
import type {
  Prisma,
  Order,
  OrderStatus,
  EventActor,
  PaymentEntry,
  Adjustment,
  OrderEvent,
  PaymentSource,
  User,
} from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"
import { assertTransition } from "@/lib/services/fsmService"
import { convertToRub } from "@/lib/services/currencyService"
import { getSettings } from "@/lib/services/settingsService"

// ── Types ────────────────────────────────────────────────────────────────────

export type OrderWithRelations = Order & {
  user: User
  payments: PaymentEntry[]
  adjustments: Adjustment[]
  events: OrderEvent[]
}

export interface CreateOrderData {
  userId: string
  actorName?: string | null  // display name of the user placing the order
  claimToken?: string        // anonymous access token for guest orders
  serviceName?: string
  tariff?: string
  duration?: string
  originalPrice?: number | string
  originalCurrency?: string
}

export type UpdateOrderData = Omit<CreateOrderData, "userId">

export interface TransitionParams {
  orderId: string
  newStatus: OrderStatus
  actor: EventActor
  actorId?: string | null
  actorName?: string | null
  message?: string
}

export interface ConfirmPaymentParams {
  orderId: string
  amountRub: number | string
  note?: string
  source?: PaymentSource
  /** Caller-supplied deduplication key. A second call with the same key returns the
   *  existing order without creating a duplicate PaymentEntry. */
  idempotencyKey?: string
  actor?: EventActor
  actorId?: string | null
  actorName?: string | null
}

export interface AdjustRequiredParams {
  orderId: string
  newRequiredRub: number | string
  reason: string
  actor?: EventActor
  actorId?: string | null
  actorName?: string | null
}

export type OrderSortField = "requiredRub" | "paidRub" | "createdAt"

export interface ListOrdersFilter {
  userId?: string
  status?: OrderStatus | OrderStatus[]
  /** When true, orders belonging to demo/showroom users are excluded. */
  excludeDemo?: boolean
  /** When true, only orders belonging to demo/showroom users are returned. */
  onlyDemo?: boolean
  limit?: number
  offset?: number
  sortBy?: OrderSortField
  sortDir?: "asc" | "desc"
  /** When true, returns OrderSummary (no events/payments/adjustments). Default: full OrderWithRelations. */
  summary?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_INCLUDE = {
  user: true,
  payments: true,
  adjustments: true,
  events: { orderBy: { createdAt: "asc" as const } },
} as const

const SUMMARY_SELECT = {
  id: true,
  status: true,
  serviceName: true,
  tariff: true,
  requiredRub: true,
  paidRub: true,
  originalPrice: true,
  originalCurrency: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, handle: true, email: true, name: true } },
} as const

export type OrderSummary = Prisma.OrderGetPayload<{ select: typeof SUMMARY_SELECT }>

/**
 * Derives the correct payment status from the current paid/required amounts.
 * Returns null if the current status is not payment-related.
 */
export function derivePaymentStatus(
  current: OrderStatus,
  requiredRub: Decimal,
  paidRub: Decimal,
): OrderStatus | null {
  const paymentStatuses: OrderStatus[] = ["WAITING_PAYMENT", "PARTIALLY_PAID", "FULLY_PAID"]
  if (!paymentStatuses.includes(current)) return null

  if (requiredRub.gt(0) && paidRub.gte(requiredRub)) return "FULLY_PAID"
  if (paidRub.gt(0)) return "PARTIALLY_PAID"
  return "WAITING_PAYMENT"
}

// ── Service functions ─────────────────────────────────────────────────────────

/** Creates a new order in DRAFT status. */
export async function createOrder(data: CreateOrderData, db = prisma): Promise<OrderWithRelations> {
  const owner = await db.user.findUnique({ where: { id: data.userId }, select: { role: true } })
  if (owner?.role === "ADMIN") throw new Error(`User ${data.userId} is an ADMIN and cannot own orders`)

  const settings = await getSettings(db)
  return db.order.create({
    data: {
      userId: data.userId,
      claimToken: data.claimToken,
      serviceName: data.serviceName,
      tariff: data.tariff,
      duration: data.duration,
      originalPrice: data.originalPrice == null ? undefined : new Decimal(data.originalPrice),
      originalCurrency: data.originalCurrency,
      serviceFeeRub: settings.serviceFeeRub,
      status: "DRAFT",
      events: {
        create: {
          actor: "CLIENT",
          actorId: data.userId,
          actorName: data.actorName ?? null,
          message: "Order created",
          newStatus: "DRAFT",
        },
      },
    },
    include: ORDER_INCLUDE,
  })
}

/** Updates mutable service details on a DRAFT or NEEDS_CLARIFICATION order. */
export async function updateOrder(
  orderId: string,
  data: UpdateOrderData,
  db = prisma,
): Promise<OrderWithRelations> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } })

  const editableStatuses: OrderStatus[] = ["DRAFT", "NEEDS_CLARIFICATION"]
  if (!editableStatuses.includes(order.status)) {
    throw new Error(`Order ${orderId} cannot be edited in status "${order.status}"`)
  }

  return db.order.update({
    where: { id: orderId },
    data: {
      serviceName: data.serviceName,
      tariff: data.tariff,
      duration: data.duration,
      originalPrice: data.originalPrice == null ? undefined : new Decimal(data.originalPrice),
      originalCurrency: data.originalCurrency,
    },
    include: ORDER_INCLUDE,
  })
}

/**
 * Fetches the live CBR rate for the order's currency, calculates requiredRub,
 * and freezes the rate on the order. Call this once all service details are set.
 *
 * Accepts an optional `convertFn` for testing (default: real convertToRub).
 */
export async function freezeRate(
  orderId: string,
  actorId: string | null = null,
  actorName: string | null = null,
  actorRole: EventActor = "ADMIN",
  db = prisma,
  convertFn = convertToRub,
): Promise<OrderWithRelations> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } })

  if (!order.originalPrice || !order.originalCurrency) {
    throw new Error("Cannot freeze rate: originalPrice and originalCurrency must be set")
  }

  const conversion = await convertFn(order.originalPrice, order.originalCurrency, order.serviceFeeRub)

  return db.order.update({
    where: { id: orderId },
    data: {
      requiredRub: conversion.totalRub,
      rateUsed: conversion.rate,
      rateTimestamp: conversion.timestamp,
      events: {
        create: {
          actor: actorId === null ? "SYSTEM" : actorRole,
          actorId,
          actorName,
          message:
            `Rate frozen: 1 ${conversion.originalCurrency} = ${conversion.rate.toFixed(4)} ₽ ` +
            `(${conversion.source}). ` +
            `Required: ${conversion.amountRub.toFixed(2)} + ${conversion.serviceFeeRub.toFixed(2)} fee = ${conversion.totalRub.toFixed(2)} ₽`,
        },
      },
    },
    include: ORDER_INCLUDE,
  })
}

/**
 * Transitions an order to a new FSM state.
 * Validates the transition, persists the status change, and writes an audit event.
 *
 * When transitioning to WAITING_PAYMENT and originalPrice is set but requiredRub is
 * still 0, the CBR rate is auto-frozen inline. If CBR is unavailable the transition
 * still succeeds — requiredRub stays 0 and the event log records the failure so
 * the admin knows to use "Adjust required" manually.
 *
 * Accepts an optional `convertFn` for testing (default: real convertToRub).
 */
export async function transitionStatus(
  params: TransitionParams,
  db = prisma,
  convertFn = convertToRub,
): Promise<OrderWithRelations> {
  const { orderId, newStatus, actor, actorId, actorName, message } = params

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } })

  assertTransition(order.status, newStatus)

  // ── Auto-freeze rate on WAITING_PAYMENT ───────────────────────────────────
  let rateFields: { requiredRub: Decimal; rateUsed: Decimal; rateTimestamp: Date } | null = null
  let autoFreezeNote: string | null = null

  if (
    newStatus === "WAITING_PAYMENT" &&
    order.originalPrice != null &&
    order.originalCurrency != null &&
    order.requiredRub.eq(0)
  ) {
    try {
      const conversion = await convertFn(order.originalPrice, order.originalCurrency, order.serviceFeeRub)
      rateFields = { requiredRub: conversion.totalRub, rateUsed: conversion.rate, rateTimestamp: conversion.timestamp }
      autoFreezeNote =
        `Rate auto-frozen: 1 ${conversion.originalCurrency} = ${conversion.rate.toFixed(4)} ₽ ` +
        `(${conversion.source}). ` +
        `Required: ${conversion.amountRub.toFixed(2)} + ${conversion.serviceFeeRub.toFixed(2)} fee = ${conversion.totalRub.toFixed(2)} ₽`
    } catch {
      autoFreezeNote = "CBR unavailable — required amount not set. Use Adjust required to set it manually."
    }
  }

  const messageParts: string[] = [message ?? `Status changed to ${newStatus}`]
  if (autoFreezeNote) messageParts.push(autoFreezeNote)
  const eventMessage = messageParts.join(". ")

  return db.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      requiredRub: rateFields?.requiredRub,
      rateUsed: rateFields?.rateUsed,
      rateTimestamp: rateFields?.rateTimestamp,
      events: {
        create: {
          actor,
          actorId: actorId ?? null,
          actorName: actorName ?? null,
          message: eventMessage,
          oldStatus: order.status,
          newStatus,
        },
      },
    },
    include: ORDER_INCLUDE,
  })
}

/**
 * Records an admin-confirmed payment entry, recalculates paidRub,
 * and auto-transitions the status (PARTIALLY_PAID / FULLY_PAID).
 *
 * source = "WALLET": atomically debits the client's wallet balance.
 * Overpayment (paidRub > requiredRub): excess is auto-credited back to the wallet.
 * DELIVERED orders are accepted for retroactive payment reconciliation.
 */
export async function confirmPayment(
  params: ConfirmPaymentParams,
  db = prisma,
): Promise<OrderWithRelations> {
  const { orderId, amountRub, note, source = "DIRECT", idempotencyKey, actor, actorId, actorName } = params

  // ── Idempotency: return existing result if key already used ──────────────
  if (idempotencyKey != null) {
    const existing = await db.paymentEntry.findUnique({ where: { idempotencyKey } })
    if (existing != null) {
      return db.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE })
    }
  }

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } })

  const payableStatuses: OrderStatus[] = [
    "WAITING_PAYMENT",
    "PARTIALLY_PAID",
    "DELIVERED", // retroactive payments allowed until CLOSED
  ]
  if (!payableStatuses.includes(order.status)) {
    throw new Error(`Cannot confirm payment for order in status "${order.status}"`)
  }

  const entryAmount = new Decimal(amountRub)
  const newPaidRub = order.paidRub.add(entryAmount)

  // Positive = client overpaid; excess goes to wallet regardless of source
  const overpayment = newPaidRub.gt(order.requiredRub)
    ? newPaidRub.sub(order.requiredRub)
    : new Decimal(0)

  // derivePaymentStatus returns null for DELIVERED — status stays DELIVERED
  const newStatus = derivePaymentStatus(order.status, order.requiredRub, newPaidRub)

  return db.$transaction(async (tx) => {
    let walletTxId: string | undefined

    // ── Wallet debit ──────────────────────────────────────────────────────────
    if (source === "WALLET") {
      // Atomic check-and-decrement: 0 rows updated = no wallet or insufficient balance
      const result = await tx.wallet.updateMany({
        where: { userId: order.userId, balanceRub: { gte: entryAmount } },
        data: { balanceRub: { decrement: entryAmount } },
      })
      if (result.count === 0) {
        throw new Error("Insufficient wallet balance")
      }
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: order.userId } })
      const walletTx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "ORDER_DEBIT",
          amountRub: entryAmount,
          orderId,
          note: note ?? null,
        },
      })
      walletTxId = walletTx.id
    }

    // ── PaymentEntry ──────────────────────────────────────────────────────────
    await tx.paymentEntry.create({
      data: {
        orderId,
        amountRub: entryAmount,
        source,
        confirmedByAdmin: true,
        note: note ?? null,
        ...(walletTxId == null ? {} : { walletTxId }),
        ...(idempotencyKey == null ? {} : { idempotencyKey }),
      },
    })

    // ── Overpayment → refund excess to wallet ─────────────────────────────────
    if (overpayment.gt(0)) {
      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId, balanceRub: overpayment },
        update: { balanceRub: { increment: overpayment } },
      })
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "REFUND",
          amountRub: overpayment,
          orderId,
          note: `Overpayment: ${entryAmount.toFixed(2)} ₽ received, ${overpayment.toFixed(2)} ₽ excess credited to wallet`,
        },
      })
    }

    // ── Update order ──────────────────────────────────────────────────────────
    const eventMsg =
      `Payment confirmed via ${source}: +${entryAmount.toFixed(2)} ₽. ` +
      `Total paid: ${newPaidRub.toFixed(2)} / ${order.requiredRub.toFixed(2)} ₽` +
      (overpayment.gt(0) ? `. Overpayment of ${overpayment.toFixed(2)} ₽ credited to wallet` : "") +
      (note ? `. Note: ${note}` : "")

    return tx.order.update({
      where: { id: orderId },
      data: {
        paidRub: newPaidRub,
        ...(newStatus != null && newStatus !== order.status ? { status: newStatus } : {}),
        events: {
          create: {
            actor: actor ?? "ADMIN",
            actorId: actorId ?? null,
            actorName: actorName ?? null,
            message: eventMsg,
            oldStatus: order.status,
            newStatus: newStatus ?? order.status,
          },
        },
      },
      include: ORDER_INCLUDE,
    })
  })
}

/**
 * Adjusts the required amount (e.g. VAT discovered at checkout, rate moved).
 * Creates an Adjustment record and re-evaluates payment status.
 */
export async function adjustRequired(
  params: AdjustRequiredParams,
  db = prisma,
): Promise<OrderWithRelations> {
  const { orderId, newRequiredRub, reason, actor, actorId, actorName } = params

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } })

  const adjustableStatuses: OrderStatus[] = [
    "WAITING_PAYMENT",
    "PARTIALLY_PAID",
    "FULLY_PAID",
    "DELIVERED", // retroactive price corrections allowed until CLOSED
  ]
  if (!adjustableStatuses.includes(order.status)) {
    throw new Error(`Cannot adjust required amount for order in status "${order.status}"`)
  }

  const newRequired = new Decimal(newRequiredRub)
  const newStatus = derivePaymentStatus(order.status, newRequired, order.paidRub)

  // If paidRub already exceeds the new required, the excess is a partial refund to the wallet
  const refundAmount = order.paidRub.gt(newRequired)
    ? order.paidRub.sub(newRequired)
    : new Decimal(0)

  return db.$transaction(async (tx) => {
    await tx.adjustment.create({
      data: {
        orderId,
        oldRequired: order.requiredRub,
        newRequired,
        reason,
      },
    })

    // ── Partial refund → wallet ───────────────────────────────────────────────
    if (refundAmount.gt(0)) {
      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId, balanceRub: refundAmount },
        update: { balanceRub: { increment: refundAmount } },
      })
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "REFUND",
          amountRub: refundAmount,
          orderId,
          note:
            `Partial refund: required reduced from ${order.requiredRub.toFixed(2)} ` +
            `to ${newRequired.toFixed(2)} ₽. Reason: ${reason}`,
        },
      })
    }

    const eventMsg =
      `Required amount adjusted: ${order.requiredRub.toFixed(2)} → ${newRequired.toFixed(2)} ₽. ` +
      `Reason: ${reason}` +
      (refundAmount.gt(0) ? `. ${refundAmount.toFixed(2)} ₽ excess credited to wallet` : "")

    return tx.order.update({
      where: { id: orderId },
      data: {
        requiredRub: newRequired,
        ...(newStatus == null || newStatus === order.status ? {} : { status: newStatus }),
        events: {
          create: {
            actor: actor ?? "ADMIN",
            actorId: actorId ?? null,
            actorName: actorName ?? null,
            message: eventMsg,
            oldStatus: order.status,
            newStatus: newStatus ?? order.status,
          },
        },
      },
      include: ORDER_INCLUDE,
    })
  })
}

/** Fetches a single order with all relations. */
export async function getOrder(orderId: string, db = prisma): Promise<OrderWithRelations> {
  return db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: ORDER_INCLUDE,
  })
}

/**
 * Fetches an order owned by the given user. Returns null if the user doesn't own it.
 * Used for session-based order access (anonymous or real BetterAuth users).
 */
export async function getOrderForUser(
  orderId: string,
  userId: string,
  db = prisma,
): Promise<OrderWithRelations | null> {
  return db.order.findFirst({
    where: { id: orderId, userId },
    include: ORDER_INCLUDE,
  })
}

/**
 * Fetches an order by ID + claimToken. Returns null if either doesn't match.
 * Used for anonymous (guest) order access via the shared claim link.
 */
export async function getOrderByClaim(
  orderId: string,
  claimToken: string,
  db = prisma,
): Promise<OrderWithRelations | null> {
  return db.order.findFirst({
    where: { id: orderId, claimToken },
    include: ORDER_INCLUDE,
  })
}

/** Lists orders. Pass `summary: true` for a lightweight projection (omits events/payments/adjustments). */
export async function listOrders(filters: ListOrdersFilter & { summary: true }, db?: typeof prisma): Promise<OrderSummary[]>
export async function listOrders(filters?: ListOrdersFilter, db?: typeof prisma): Promise<OrderWithRelations[]>
export async function listOrders(
  filters: ListOrdersFilter & { summary?: boolean } = {},
  db = prisma,
): Promise<OrderWithRelations[] | OrderSummary[]> {
  const { userId, status, excludeDemo, onlyDemo, limit = 50, offset = 0, sortBy, sortDir = "asc", summary = false } = filters
  const where = buildWhere({ userId, status, excludeDemo, onlyDemo })
  const orderBy = sortBy ? { [sortBy]: sortDir } : { updatedAt: "desc" as const }
  if (summary) {
    return db.order.findMany({ where, select: SUMMARY_SELECT, orderBy, take: limit, skip: offset })
  }
  return db.order.findMany({ where, include: ORDER_INCLUDE, orderBy, take: limit, skip: offset })
}

type BaseFilter = Pick<ListOrdersFilter, "userId" | "status" | "excludeDemo" | "onlyDemo">

function buildWhere(filters: BaseFilter) {
  const { userId, status, excludeDemo, onlyDemo } = filters
  return {
    ...(userId ? { userId } : {}),
    ...(status ? { status: Array.isArray(status) ? { in: status } : status } : {}),
    ...(excludeDemo ? { user: { isDemo: false } } : {}),
    ...(onlyDemo ? { user: { isDemo: true } } : {}),
  }
}

/** Counts orders matching the same filters as listOrders (without limit/offset/sort). */
export async function countOrders(filters: BaseFilter = {}, db = prisma): Promise<number> {
  return db.order.count({ where: buildWhere(filters) })
}

export interface OrderStats {
  total: number
  needsAction: number
  awaitingPayment: number
  totalCollectedRub: number
}

/** Aggregated stats for a set of orders — runs 3 queries in parallel. */
export async function getOrderStats(filters: BaseFilter = {}, db = prisma): Promise<OrderStats> {
  const where = buildWhere(filters)
  const [total, needsAction, awaitingPayment, agg] = await Promise.all([
    db.order.count({ where }),
    db.order.count({ where: { ...where, status: { in: ["WAITING_ADMIN_APPROVAL", "NEEDS_CLARIFICATION"] } } }),
    db.order.count({ where: { ...where, status: { in: ["WAITING_PAYMENT", "PARTIALLY_PAID"] } } }),
    db.order.aggregate({ where, _sum: { paidRub: true } }),
  ])
  return {
    total,
    needsAction,
    awaitingPayment,
    totalCollectedRub: agg._sum.paidRub?.toNumber() ?? 0,
  }
}

/** Returns the current outstanding balance (positive = still owed). */
export function getBalance(order: Pick<Order, "requiredRub" | "paidRub">): Decimal {
  return order.requiredRub.sub(order.paidRub)
}
