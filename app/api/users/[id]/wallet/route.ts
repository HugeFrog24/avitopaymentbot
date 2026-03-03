import { type NextRequest } from "next/server"
import { requireScope, hasScope } from "@/lib/api/auth"
import { getWalletWithTransactions } from "@/lib/services/walletService"
import { ok, forbidden, notFound } from "@/lib/api/response"
import type { IdParams } from "@/lib/api/types"

// GET /api/users/:id/wallet — wallet balance + last 50 transactions
// ADMIN and BOT: any wallet. CLIENT: own wallet only.
export async function GET(_req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("wallet:read:own", "wallet:read:all")
  if (!caller.ok) return caller.response

  const { id } = await params

  if (!hasScope(caller, "wallet:read:all") && caller.userId !== id) return forbidden()

  const wallet = await getWalletWithTransactions(id)
  if (wallet == null) return notFound("Wallet not found")
  return ok(wallet)
}
