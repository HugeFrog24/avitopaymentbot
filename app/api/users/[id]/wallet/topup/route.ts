import { type NextRequest } from "next/server"
import { requireScope } from "@/lib/api/auth"
import { topUp } from "@/lib/services/walletService"
import { ok, badRequest, notFound, serverError, isPrismaNotFound } from "@/lib/api/response"
import type { IdParams } from "@/lib/api/types"

// POST /api/users/:id/wallet/topup — admin credits funds to a client's wallet (ADMIN only)
export async function POST(req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("wallet:topup")
  if (!caller.ok) return caller.response

  try {
    const { id } = await params
    const body = (await req.json()) as Record<string, unknown>

    const amountRub = body.amountRub
    if (amountRub == null || (typeof amountRub !== "string" && typeof amountRub !== "number")) {
      return badRequest("amountRub is required")
    }

    const note = typeof body.note === "string" ? body.note : undefined
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined

    const wallet = await topUp({ userId: id, amountRub, note, idempotencyKey })
    return ok(wallet)
  } catch (err) {
    if (isPrismaNotFound(err)) return notFound("User not found")
    if (err instanceof Error && err.message === "Top-up amount must be positive") {
      return badRequest(err.message)
    }
    return serverError(err)
  }
}
