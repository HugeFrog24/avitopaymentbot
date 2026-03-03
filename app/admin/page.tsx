import { Package, Clock, CreditCard, CircleDollarSign } from "lucide-react"
import { requireAdminPage } from "@/lib/api/auth"
import { listOrders, getOrderStats, type OrderSortField } from "@/lib/services/orderService"
import { OrdersTable } from "@/app/_components/OrdersTable"
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/app/_components/Pagination"
import { DemoFilter, type DemoMode } from "./_components/DemoFilter"

const rubCompact = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  notation: "compact",
})

const VALID_SORT = new Set<OrderSortField>(["requiredRub", "paidRub", "createdAt"])

export default async function AdminPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ demo?: string; sort?: string; dir?: string; page?: string; pageSize?: string }>
}>) {
  await requireAdminPage()
  const { demo, sort, dir, page: pageParam, pageSize: pageSizeParam } = await searchParams

  let demoMode: DemoMode = "all"
  if (demo === "exclude") demoMode = "exclude"
  else if (demo === "only") demoMode = "only"

  const sortBy = VALID_SORT.has(sort as OrderSortField) ? (sort as OrderSortField) : undefined
  const sortDir = dir === "asc" || dir === "desc" ? dir : undefined
  const pageSize = PAGE_SIZES.includes(Number(pageSizeParam) as typeof PAGE_SIZES[number])
    ? Number(pageSizeParam)
    : DEFAULT_PAGE_SIZE
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1)
  const offset = (page - 1) * pageSize

  let demoFilter: { excludeDemo?: boolean; onlyDemo?: boolean } = {}
  if (demoMode === "exclude") demoFilter = { excludeDemo: true }
  else if (demoMode === "only") demoFilter = { onlyDemo: true }
  const params: Record<string, string | undefined> = {
    demo,
    sort: sortBy,
    dir: sortDir,
    page: String(page),
    pageSize: String(pageSize),
  }

  const [orders, stats] = await Promise.all([
    listOrders({ ...demoFilter, sortBy, sortDir, limit: pageSize, offset, summary: true }),
    getOrderStats(demoFilter),
  ])

  const cards = [
    {
      label: "Total orders",
      value: String(stats.total),
      icon: Package,
      iconClass: "text-zinc-400",
    },
    {
      label: "Need action",
      value: String(stats.needsAction),
      icon: Clock,
      iconClass: stats.needsAction > 0 ? "text-violet-500" : "text-zinc-300",
      valueClass: stats.needsAction > 0 ? "text-violet-600" : undefined,
    },
    {
      label: "Awaiting payment",
      value: String(stats.awaitingPayment),
      icon: CreditCard,
      iconClass: stats.awaitingPayment > 0 ? "text-orange-400" : "text-zinc-300",
      valueClass: stats.awaitingPayment > 0 ? "text-orange-500" : undefined,
    },
    {
      label: "Collected",
      value: rubCompact.format(stats.totalCollectedRub),
      icon: CircleDollarSign,
      iconClass: "text-emerald-500",
      valueClass: "text-emerald-600",
    },
  ]

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                {card.label}
              </span>
              <card.icon size={16} className={card.iconClass} />
            </div>
            <p
              className={`text-2xl font-semibold tabular-nums ${card.valueClass ?? "text-zinc-900 dark:text-zinc-100"}`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Orders table ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Orders</h1>
          <div className="flex items-center gap-3">
            <DemoFilter current={demoMode} />
            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{stats.total} total</span>
          </div>
        </div>
        <OrdersTable orders={orders} isAdmin={true} params={params} />
        <Pagination total={stats.total} page={page} pageSize={pageSize} params={params} />
      </div>
    </main>
  )
}
