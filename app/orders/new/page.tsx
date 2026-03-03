import { resolveCaller, hasScope } from "@/lib/api/auth"
import { OrderNewClient } from "./_components/OrderNewClient"

export default async function OrderNewPage() {
  const caller = await resolveCaller()
  const isAdmin = caller.ok && hasScope(caller, "orders:write:all")

  return <OrderNewClient isAdmin={isAdmin} />
}
