import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listOrders, countOrders, type OrderSortField } from "@/lib/services/orderService"
import { OrdersTable } from "@/app/_components/OrdersTable"
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/app/_components/Pagination"

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

  const [orders, total] = await Promise.all([
    listOrders({ userId: session.user.id, sortBy, sortDir, limit: pageSize, offset, summary: true }),
    countOrders({ userId: session.user.id }),
  ])

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
        My Orders
      </h1>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <OrdersTable orders={orders} isAdmin={false} params={params} />
        <Pagination total={total} page={page} pageSize={pageSize} params={params} />
      </div>
    </main>
  )
}
