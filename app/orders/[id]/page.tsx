import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getOrderByClaim, getOrderForUser } from "@/lib/services/orderService"
import { OrderDetail } from "./_components/OrderDetail"

export default async function ClientOrderPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}>) {
  const { id } = await params
  const { token } = await searchParams

  // ── Session-based access (anonymous or real BetterAuth user) ─────────────
  // Checked first so anonymous users with a session don't need the token in
  // the URL (though the claimToken URL still works as a cross-device fallback).
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) {
    const sessionOrder = await getOrderForUser(id, session.user.id)
    if (sessionOrder != null) return <OrderDetail order={sessionOrder} isAdmin={false} />
  }

  // ── ClaimToken fallback (cross-device / cookie-less access) ──────────────
  if (!token) notFound()
  const order = await getOrderByClaim(id, token)
  if (order == null) notFound()

  return <OrderDetail order={order} isAdmin={false} />
}
