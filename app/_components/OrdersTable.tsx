import Link from "next/link"
import { ArrowUpRight, ChevronUp, ChevronDown, ChevronsUpDown, Receipt } from "lucide-react"
import { type Decimal } from "@prisma/client/runtime/client"
import { StatusBadge } from "@/app/_components/StatusBadge"
import type { OrderSummary, OrderSortField } from "@/lib/services/orderService"
import { UserAvatar } from "@/app/_components/UserAvatar"
import { buildUrl } from "@/app/_components/Pagination"

const fmt = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function rub(value: Decimal) {
  const n = value.toNumber()
  return n === 0 ? "—" : fmt.format(n)
}

function balance(required: Decimal, paid: Decimal) {
  const n = required.sub(paid).toNumber()
  if (n <= 0 || required.isZero()) return null
  return fmt.format(n)
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" })

const TH = "px-4 py-3 text-xs font-medium tracking-wide text-zinc-400 dark:text-zinc-500 uppercase"

function SortHeader({
  col,
  label,
  params,
  align = "left",
}: Readonly<{
  col: OrderSortField
  label: string
  params: Record<string, string | undefined>
  align?: "left" | "right"
}>) {
  const isActive = params.sort === col
  const currentDir = params.dir as "asc" | "desc" | undefined
  const nextDir = isActive && currentDir === "asc" ? "desc" : "asc"
  // Sort changes always reset to page 1
  const href = buildUrl(params, { sort: col, dir: nextDir, page: "1" })

  let Icon = ChevronsUpDown
  if (isActive) Icon = currentDir === "asc" ? ChevronUp : ChevronDown

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ${isActive ? "text-zinc-600 dark:text-zinc-300" : ""}`}
    >
      {align === "right" && <Icon size={11} className={isActive ? "" : "opacity-40"} />}
      {label}
      {align === "left" && <Icon size={11} className={isActive ? "" : "opacity-40"} />}
    </Link>
  )
}

interface Props {
  orders: OrderSummary[]
  isAdmin: boolean
  /** All current URL search params — used to build sort links that preserve pagination/filter state. */
  params: Record<string, string | undefined>
}

export function OrdersTable({ orders, isAdmin, params }: Readonly<Props>) {
  if (orders.length === 0) {
    return <div className="px-6 py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">No orders yet.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/60">
            <th className={`px-6 py-3 text-left ${TH}`}>
              ID
            </th>
            {isAdmin && (
              <th className={`text-left ${TH}`}>
                Client
              </th>
            )}
            <th className={`text-left ${TH}`}>
              Service
            </th>
            <th className={`text-left ${TH}`}>
              Original
            </th>
            <th className={`text-right ${TH}`}>
              <SortHeader col="requiredRub" label="Required" params={params} align="right" />
            </th>
            <th className={`text-right ${TH}`}>
              <SortHeader col="paidRub" label="Paid" params={params} align="right" />
            </th>
            <th className={`text-right ${TH}`}>
              Balance
            </th>
            <th className={`text-left ${TH}`}>
              Status
            </th>
            <th className={`text-left ${TH}`}>
              <SortHeader col="receiptRequested" label="Чек" params={params} align="left" />
            </th>
            <th className={`text-left ${TH}`}>
              <SortHeader col="createdAt" label="Date" params={params} align="left" />
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {orders.map((order) => {
            const bal = balance(order.requiredRub, order.paidRub)
            const orderHref = isAdmin ? `/admin/orders/${order.id}` : `/orders/${order.id}`
            return (
              <tr
                key={order.id}
                className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/70 transition-colors duration-100"
              >
                {/* ID */}
                <td className="px-6 py-4">
                  <Link
                    href={orderHref}
                    className="inline-flex items-center gap-1 font-mono text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    {order.id.slice(0, 8)}
                    <ArrowUpRight size={11} className="shrink-0" />
                  </Link>
                </td>

                {/* Client — admin only */}
                {isAdmin && (
                  <td className="px-4 py-4 font-medium text-zinc-700 dark:text-zinc-300">
                    <Link
                      href={`/users/${order.user.id}`}
                      className="inline-flex items-center gap-2 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline transition-colors"
                    >
                      <span className="shrink-0 rounded-full overflow-hidden">
                        <UserAvatar userId={order.user.id} size={20} />
                      </span>
                      {order.user.handle ?? order.user.email ?? order.user.name ?? "—"}
                    </Link>
                  </td>
                )}

                {/* Service */}
                <td className="px-4 py-4">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{order.serviceName ?? "—"}</p>
                  {order.tariff != null && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{order.tariff}</p>
                  )}
                </td>

                {/* Original price */}
                <td className="px-4 py-4 text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {order.originalPrice != null && order.originalCurrency != null
                    ? `${order.originalPrice.toFixed(2)} ${order.originalCurrency}`
                    : "—"}
                </td>

                {/* Required ₽ */}
                <td className="px-4 py-4 text-right font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                  {rub(order.requiredRub)}
                </td>

                {/* Paid ₽ */}
                <td className="px-4 py-4 text-right tabular-nums text-emerald-600 font-medium">
                  {rub(order.paidRub)}
                </td>

                {/* Balance */}
                <td className="px-4 py-4 text-right tabular-nums">
                  {bal == null ? (
                    <span className="text-zinc-300 dark:text-zinc-600">—</span>
                  ) : (
                    <span className="text-orange-500 font-medium">{bal}</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <StatusBadge status={order.status} />
                </td>

                {/* Чек */}
                <td className="px-4 py-4">
                  {order.receiptRequested
                    ? <span title="Receipt requested"><Receipt size={14} className="text-violet-500" /></span>
                    : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                </td>

                {/* Date */}
                <td className="px-4 py-4 text-xs text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                  {SHORT_DATE.format(order.createdAt)}
                </td>

              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
