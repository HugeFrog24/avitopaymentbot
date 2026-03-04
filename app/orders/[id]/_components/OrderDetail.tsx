import Link from "next/link"
import { ArrowLeft, Receipt } from "lucide-react"
import { getNextStates } from "@/lib/services/fsmService"
import type { EventActor, OrderStatus, PaymentSource } from "@/lib/generated/prisma/client"
import type { OrderWithRelations } from "@/lib/services/orderService"
import { StatusBadge } from "@/app/_components/StatusBadge"
import { TransitionButtons } from "@/app/admin/orders/[id]/_components/TransitionButtons"
import { ConfirmPaymentForm } from "@/app/admin/orders/[id]/_components/ConfirmPaymentForm"
import { AdjustRequiredForm } from "@/app/admin/orders/[id]/_components/AdjustRequiredForm"
import { fetchRate } from "@/lib/services/currencyService"
import { UserAvatar } from "@/app/_components/UserAvatar"
import { InternalNoteBox } from "@/app/admin/orders/[id]/_components/InternalNoteBox"

// ── Formatters ────────────────────────────────────────────────────────────────

const rubFmt = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function rub(n: number) {
  return n === 0 ? "₽0" : rubFmt.format(n)
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const SHORT_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

// ── Status label for client-facing timeline ───────────────────────────────────

const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Order received",
  NEEDS_CLARIFICATION: "Waiting for more details",
  CONTEXT_COMPLETE: "Details confirmed",
  WAITING_ADMIN_APPROVAL: "Pending review",
  REJECTED: "Order rejected",
  WAITING_PAYMENT: "Awaiting payment",
  PARTIALLY_PAID: "Payment partially received",
  FULLY_PAID: "Payment complete",
  DELIVERED: "Delivered",
  CLOSED: "Order closed",
  REFUNDED: "Refunded",
}

// ── Actor badge styles + labels ───────────────────────────────────────────────

const ACTOR_STYLES: Record<EventActor, string> = {
  ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  BOT: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  CLIENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  SYSTEM: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
}

// Admin: shows actual actorName when available, falls back to this.
const ACTOR_LABEL: Record<EventActor, string> = {
  ADMIN: "Admin",
  BOT: "Bot",
  CLIENT: "Client",
  SYSTEM: "System",
}

// Client: role-type only — no personal names, but enough to know human vs automated.
const CLIENT_ACTOR_LABEL: Record<EventActor, string> = {
  ADMIN: "Operator",
  BOT: "System",
  CLIENT: "You",
  SYSTEM: "System",
}

const SOURCE_LABEL: Record<PaymentSource, string> = {
  DIRECT: "Direct",
  WALLET: "Wallet",
}

// ── Status capability sets ────────────────────────────────────────────────────

const PAYABLE = new Set<OrderStatus>(["WAITING_PAYMENT", "PARTIALLY_PAID", "DELIVERED"])
const ADJUSTABLE = new Set<OrderStatus>([
  "WAITING_PAYMENT",
  "PARTIALLY_PAID",
  "FULLY_PAID",
  "DELIVERED",
])

// ── Shared section header ─────────────────────────────────────────────────────

function SectionHeader({ title }: Readonly<{ title: string }>) {
  return (
    <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{title}</h2>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface OrderDetailProps {
  order: OrderWithRelations
  isAdmin: boolean
  /** Breadcrumb back link (e.g. "/admin"). Omit to hide the breadcrumb. */
  backHref?: string
}

export async function OrderDetail({ order, isAdmin, backHref }: Readonly<OrderDetailProps>) {
  const { user, payments, adjustments, events } = order
  const requiredRub = order.requiredRub.toNumber()
  const paidRub = order.paidRub.toNumber()
  const balance = requiredRub - paidRub

  const nextStates = getNextStates(order.status)
  const canPay = PAYABLE.has(order.status)
  const canAdjust = ADJUSTABLE.has(order.status)

  // ── Ruble estimate ──────────────────────────────────────────────────────────
  // Shown when requiredRub is not yet set but originalPrice is available.
  // Fetches the live CBR rate; silently omitted if CBR is unavailable.
  const estimatedConversion = await (async () => {
    if (order.originalPrice == null || order.originalCurrency == null) return null
    if (order.requiredRub.gt(0)) return null
    const originalAmount = order.originalPrice.toNumber()
    const currency = order.originalCurrency
    const serviceFeeRub = order.serviceFeeRub.toNumber()
    try {
      if (currency === "RUB") {
        return { originalAmount, amountRub: originalAmount, serviceFeeRub, totalRub: originalAmount + serviceFeeRub, rate: 1, currency: "RUB", source: "Direct" }
      }
      const rateResult = await fetchRate(currency)
      const amountRub = Math.round(originalAmount * rateResult.rate.toNumber() * 100) / 100
      return { originalAmount, amountRub, serviceFeeRub, totalRub: amountRub + serviceFeeRub, rate: rateResult.rate.toNumber(), currency, source: rateResult.source }
    } catch {
      return null
    }
  })()

  // Clients see only status-transition events; admins see everything.
  const visibleEvents = isAdmin
    ? events
    : events.filter((ev) => ev.newStatus != null && ev.oldStatus !== ev.newStatus)

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* ── Breadcrumb ── */}
      {backHref != null && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={13} />
          Orders
        </Link>
      )}

      {/* ── Overview card ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs text-zinc-300 dark:text-zinc-600 shrink-0">{order.id.slice(0, 8)}</span>
            <StatusBadge status={order.status} />
            {order.serviceName != null && (
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {order.serviceName}
              </span>
            )}
            {order.tariff != null && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{order.tariff}</span>
            )}
            {order.receiptRequested && (
              <span title="Receipt requested" className="shrink-0">
                <Receipt size={13} className="text-violet-500" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
            {isAdmin && (
              <Link
                href={`/users/${user.id}`}
                className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline transition-colors"
              >
                <span className="shrink-0 rounded-full overflow-hidden">
                  <UserAvatar userId={user.id} size={18} />
                </span>
                {user.handle ?? user.email ?? user.name ?? "Unknown client"}
              </Link>
            )}
            <span>{SHORT_DATE.format(order.createdAt)}</span>
          </div>
        </div>

        {/* Amount grid */}
        <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Original price</p>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {order.originalPrice != null && order.originalCurrency != null
                ? `${order.originalPrice.toFixed(2)} ${order.originalCurrency}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Required</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {requiredRub === 0 ? "—" : rub(requiredRub)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Paid</p>
            <p className="text-sm font-semibold text-emerald-600 tabular-nums">
              {paidRub === 0 ? "—" : rub(paidRub)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Balance due</p>
            <p
              className={`text-sm font-semibold tabular-nums ${balance > 0 ? "text-orange-500" : "text-zinc-300 dark:text-zinc-600"}`}
            >
              {balance > 0 ? rub(balance) : "—"}
            </p>
          </div>
        </div>

        {/* Ruble estimate — shown before requiredRub is locked */}
        {estimatedConversion != null && (
          <div className="px-6 pb-5">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 px-4 py-3">
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                Estimated total · {estimatedConversion.source}
              </p>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums space-y-0.5 mb-2">
                {estimatedConversion.currency !== "RUB" && (
                  <p>
                    {estimatedConversion.originalAmount.toFixed(2)}{" "}
                    {estimatedConversion.currency} × {estimatedConversion.rate.toFixed(4)} ={" "}
                    {rubFmt.format(estimatedConversion.amountRub)}
                  </p>
                )}
                <p>+ {rubFmt.format(estimatedConversion.serviceFeeRub)} service fee</p>
              </div>
              <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                ≈ {rubFmt.format(estimatedConversion.totalRub)}
              </p>
              <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                Rate updated daily by CBR. Final amount locked when admin confirms the quote.
              </p>
            </div>
          </div>
        )}

        {/* Rate row */}
        {order.rateUsed != null && (
          <div className="px-6 pb-4">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Rate: 1 {order.originalCurrency} ={" "}
              <span className="font-mono">{order.rateUsed.toFixed(4)}</span> ₽
              {order.rateTimestamp != null && <> · {SHORT_TIME.format(order.rateTimestamp)}</>}
            </p>
          </div>
        )}
      </div>

      {/* ── Middle: data columns + optional admin sidebar ── */}
      <div className={isAdmin ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "space-y-6"}>
        {/* Left / main col */}
        <div className={isAdmin ? "lg:col-span-2 space-y-6" : "space-y-6"}>
          {/* Payments */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <SectionHeader title="Payments" />
            {payments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-400 dark:text-zinc-500 text-center">No payments recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/60">
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                        Amount
                      </th>
                      {isAdmin && (
                        <>
                          <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                            Source
                          </th>
                          <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                            Note
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3 text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                          {SHORT_DATE.format(p.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums text-emerald-600">
                          {rub(p.amountRub.toNumber())}
                        </td>
                        {isAdmin && (
                          <>
                            <td className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">{SOURCE_LABEL[p.source]}</td>
                            <td className="px-5 py-3 text-xs text-zinc-400 dark:text-zinc-500">{p.note ?? "—"}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Adjustments */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <SectionHeader title="Price adjustments" />
            {adjustments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-400 dark:text-zinc-500 text-center">
                No adjustments recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/60">
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                        Old required
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                        New required
                      </th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {adjustments.map((a) => (
                      <tr key={a.id}>
                        <td className="px-5 py-3 text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                          {SHORT_DATE.format(a.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-zinc-400 dark:text-zinc-500 line-through">
                          {rub(a.oldRequired.toNumber())}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                          {rub(a.newRequired.toNumber())}
                        </td>
                        <td className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">{a.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Admin-only sidebar */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="Status transition" />
              <div className="p-4">
                <TransitionButtons orderId={order.id} nextStates={nextStates} />
              </div>
            </div>

            {canPay && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <SectionHeader title="Confirm payment" />
                <div className="p-4">
                  <ConfirmPaymentForm orderId={order.id} remainingBalanceRub={balance} />
                </div>
              </div>
            )}

            {canAdjust && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <SectionHeader title="Adjust required" />
                <div className="p-4">
                  <AdjustRequiredForm orderId={order.id} />
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="Internal note" />
              <div className="p-4">
                <InternalNoteBox orderId={order.id} initialNote={order.internalNote} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Event log / timeline ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <SectionHeader title={isAdmin ? "Event log" : "Order timeline"} />
        {visibleEvents.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 dark:text-zinc-500 text-center">No events recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                <th className="pl-5 pr-4 py-2.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">Time</th>
                <th className="pr-3 py-2.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">Role</th>
                {isAdmin && <th className="pr-4 py-2.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">Name</th>}
                <th className="pr-5 py-2.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visibleEvents.map((ev) => (
                <tr key={ev.id} className="align-top">
                  <td className="pl-5 pr-4 py-3.5 text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap tabular-nums">
                    {SHORT_TIME.format(ev.createdAt)}
                  </td>
                  <td className="pr-3 py-3.5 whitespace-nowrap">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ACTOR_STYLES[ev.actor]}`}>
                      {isAdmin ? ACTOR_LABEL[ev.actor] : CLIENT_ACTOR_LABEL[ev.actor]}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="pr-4 py-3.5 whitespace-nowrap">
                      {ev.actorName != null && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ACTOR_STYLES[ev.actor]}`}>
                          {ev.actorName}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="pr-5 py-3.5 w-full">
                    {ev.message != null && (
                      <p className="text-zinc-700 dark:text-zinc-300 break-words">{ev.message}</p>
                    )}
                    {ev.oldStatus != null &&
                      ev.newStatus != null &&
                      ev.oldStatus !== ev.newStatus && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {STATUS_LABEL[ev.oldStatus]} → {STATUS_LABEL[ev.newStatus]}
                        </p>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
