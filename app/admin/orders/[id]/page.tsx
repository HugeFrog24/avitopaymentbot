import { notFound } from "next/navigation"
import { requireAdminPage, requireScope } from "@/lib/api/auth"
import { getOrder, getInternalNote } from "@/lib/services/orderService"
import { OrderDetail } from "@/app/orders/[id]/_components/OrderDetail"

export default async function AdminOrderDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  await requireAdminPage()
  const { id } = await params
  const noteScope = await requireScope("orders:notes:read")
  const [order, orderNote] = await Promise.all([
    getOrder(id).catch(() => null),
    noteScope.ok ? getInternalNote(id) : Promise.resolve(null),
  ])
  if (order == null) notFound()

  return <OrderDetail order={order} isAdmin={true} backHref="/admin" orderNote={orderNote} />
}
