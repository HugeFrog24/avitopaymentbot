import { randomBytes } from "node:crypto"
import { type NextRequest } from "next/server"
import { requireScope, hasScope } from "@/lib/api/auth"
import { createOrder, listOrders, type OrderSortField } from "@/lib/services/orderService"
import { ALL_STATUSES } from "@/lib/services/fsmService"
import type { OrderStatus } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"
import { ok, created, badRequest, serverError } from "@/lib/api/response"
import type { CallerResult } from "@/lib/api/auth"

function str(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined
}

// Callers with orders:create:behalf must never own orders as clients — mint a fresh
// anonymous user when no explicit body.userId is provided.
async function resolveOrderOwner(caller: CallerResult & { ok: true }, bodyUserId: unknown): Promise<string | null> {
  if (hasScope(caller, "orders:create:behalf")) {
    const explicit = str(bodyUserId)
    if (explicit) return explicit
    const newClient = await prisma.user.create({ data: { isAnonymous: true, role: "CLIENT" } })
    return newClient.id
  }
  return caller.userId
}

// POST /api/orders — create a new order
// Priority for userId resolution:
//   1. body.userId   — trusted only for callers with orders:create:behalf (create on behalf of a client)
//   2. mint new anonymous CLIENT — orders:create:behalf callers without explicit userId (never use their own id)
//   3. session       — CLIENT callers are always pinned to their own userId
//   4. 400           — CLIENT with no session identity
// clientHandle (optional) is written to the user's handle field if not already set.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>

    // ── Resolve caller ────────────────────────────────────────────────────────
    // POST /api/orders is proxy-exempted so it always reaches the handler.
    // We still enforce: a valid session or bot key must be present.
    const caller = await requireScope("orders:create")
    if (!caller.ok) return caller.response

    // ── Validate required fields ──────────────────────────────────────────────
    const serviceName = str(body.serviceName)?.trim()
    if (!serviceName) return badRequest("serviceName is required")

    // ── Resolve order owner ───────────────────────────────────────────────────
    const userId = await resolveOrderOwner(caller, body.userId)
    if (!userId) return badRequest("No user identity available")

    // ── Backfill handle if provided and not yet set ───────────────────────────
    const handle = str(body.clientHandle)?.trim() ?? null
    if (handle) {
      await prisma.user.updateMany({ where: { id: userId, handle: null }, data: { handle } })
    }

    // ── Generate claim token (cross-device fallback) ──────────────────────────
    const claimToken = randomBytes(32).toString("base64url")

    // ── Create order ─────────────────────────────────────────────────────────
    const order = await createOrder({
      userId,
      actorName: caller.actorName,
      claimToken,
      serviceName,
      tariff: str(body.tariff),
      duration: str(body.duration),
      originalPrice: typeof body.originalPrice === "string" || typeof body.originalPrice === "number"
        ? body.originalPrice
        : undefined,
      originalCurrency: str(body.originalCurrency),
      receiptRequested: body.receiptRequested === true,
    })

    return created({ ...order, claimUrl: `/orders/${order.id}?token=${claimToken}` })
  } catch (err) {
    return serverError(err)
  }
}

// GET /api/orders — list orders
// orders:list:all scope: full list, optional ?userId= filter
// CLIENT: always scoped to their own orders (query ?userId= is ignored)
export async function GET(req: NextRequest) {
  const caller = await requireScope("orders:list:own", "orders:list:all")
  if (!caller.ok) return caller.response

  try {
    const { searchParams } = req.nextUrl

    // Callers with list:all may filter by userId; others are pinned to themselves.
    const userId = hasScope(caller, "orders:list:all")
      ? (searchParams.get("userId") ?? undefined)
      : (caller.userId ?? undefined)

    const statusParam = searchParams.get("status")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "", 10) || 50, 100)
    const offset = Number.parseInt(searchParams.get("offset") ?? "", 10) || 0

    const VALID_SORT = new Set<OrderSortField>(["requiredRub", "paidRub", "createdAt", "receiptRequested"])
    const sortParam = searchParams.get("sortBy") ?? ""
    const sortBy = VALID_SORT.has(sortParam as OrderSortField) ? (sortParam as OrderSortField) : undefined
    const sortDirParam = searchParams.get("sortDir")
    const sortDir = sortDirParam === "asc" || sortDirParam === "desc" ? sortDirParam : undefined

    let status: OrderStatus[] | undefined
    if (statusParam) {
      const values = statusParam.split(",")
      const invalid = values.filter((s) => !ALL_STATUSES.includes(s as OrderStatus))
      if (invalid.length > 0) {
        return badRequest(`Invalid status values: ${invalid.join(", ")}`)
      }
      status = values as OrderStatus[]
    }

    const orders = await listOrders({ userId, status, limit, offset, sortBy, sortDir })
    return ok(orders)
  } catch (err) {
    return serverError(err)
  }
}
