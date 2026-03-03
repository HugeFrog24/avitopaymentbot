import { resolveCaller, hasScope } from "@/lib/api/auth"
import { fetchAvailableCurrencies } from "@/lib/services/currencyService"
import { OrderNewClient } from "./_components/OrderNewClient"

export default async function OrderNewPage() {
  const [caller, currencies] = await Promise.all([
    resolveCaller(),
    fetchAvailableCurrencies(),
  ])
  const isAdmin = caller.ok && hasScope(caller, "orders:write:all")

  return <OrderNewClient isAdmin={isAdmin} currencies={currencies} />
}
