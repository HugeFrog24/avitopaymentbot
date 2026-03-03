import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Package, CreditCard, CircleDollarSign } from "lucide-react"
import { auth } from "@/lib/auth"
import { listOrders, getOrderStats, type OrderSortField } from "@/lib/services/orderService"
import { OrdersTable } from "@/app/_components/OrdersTable"
import { StatCard } from "@/app/_components/StatCard"
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/app/_components/Pagination"

const rubCompact = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  notation: "compact",
})

const VALID_SORT = new Set<OrderSortField>(["requiredRub", "paidRub", "createdAt"])

export default async function MyOrdersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ sort?: string; dir?: string; page?: string; pageSize?: string }> }>) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { sort, dir, page: pageParam, pageSize: pageSizeParam } = await searchParams

  const sortBy = VALID_SORT.has(sort as OrderSortField) ? (sort as OrderSortField) : undefined
  const sortDir = dir === "asc" || dir === "desc" ? dir : undefined
  const pageSize = PAGE_SIZES.includes(Number(pageSizeParam) as typeof PAGE_SIZES[number])
    ? Number(pageSizeParam)
    : DEFAULT_PAGE_SIZE
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1)
  const offset = (page - 1) * pageSize

  const params: Record<string, string | undefined> = { sort: sortBy, dir: sortDir, page: String(page), pageSize: String(pageSize) }

  const [orders, stats] = await Promise.all([
    listOrders({ userId: session.user.id, sortBy, sortDir, limit: pageSize, offset, summary: true }),
    getOrderStats({ userId: session.user.id }),
  ])

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total orders"
          value={String(stats.total)}
          icon={Package}
          iconClass="text-zinc-400"
        />
        <StatCard
          label="Awaiting payment"
          value={String(stats.awaitingPayment)}
          icon={CreditCard}
          iconClass={stats.awaitingPayment > 0 ? "text-orange-400" : "text-zinc-300"}
          valueClass={stats.awaitingPayment > 0 ? "text-orange-500" : undefined}
        />
        <StatCard
          label="Total spent"
          value={rubCompact.format(stats.totalCollectedRub)}
          icon={CircleDollarSign}
          iconClass="text-emerald-500"
          valueClass="text-emerald-600"
        />
      </div>

      {/* ── Orders table ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">My orders</h1>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{stats.total} total</span>
        </div>
        <OrdersTable orders={orders} isAdmin={false} params={params} />
        <Pagination total={stats.total} page={page} pageSize={pageSize} params={params} />
      </div>
    </main>
  )
}
