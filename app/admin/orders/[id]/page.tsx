import { notFound } from "next/navigation"
import { requireAdminPage } from "@/lib/api/auth"
import { getOrder } from "@/lib/services/orderService"
import { OrderDetail } from "@/app/orders/[id]/_components/OrderDetail"

export default async function AdminOrderDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  await requireAdminPage()
  const { id } = await params
  const order = await getOrder(id).catch(() => null)
  if (order == null) notFound()

  return <OrderDetail order={order} isAdmin={true} backHref="/admin" />
}
