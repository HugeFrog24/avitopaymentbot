import { type NextRequest } from "next/server"
import { requireScope } from "@/lib/api/auth"
import { confirmPayment } from "@/lib/services/orderService"
import { ok, badRequest, notFound, serverError, isPrismaNotFound } from "@/lib/api/response"
import type { IdParams } from "@/lib/api/types"

// POST /api/orders/:id/payments — confirm a payment entry (orders:payments:write)
export async function POST(req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("orders:payments:write")
  if (!caller.ok) return caller.response

  try {
    const { id } = await params
    const body = (await req.json()) as Record<string, unknown>

    const amountRub = body.amountRub
    if (amountRub == null || (typeof amountRub !== "string" && typeof amountRub !== "number")) {
      return badRequest("amountRub is required")
    }

    const note = typeof body.note === "string" ? body.note : undefined
    const source = body.source === "WALLET" ? ("WALLET" as const) : ("DIRECT" as const)
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined

    const order = await confirmPayment({ orderId: id, amountRub, note, source, idempotencyKey, actor: caller.role, actorId: caller.userId, actorName: caller.actorName })
    return ok(order)
  } catch (err) {
    if (isPrismaNotFound(err)) return notFound("Order not found")
    if (
      err instanceof Error &&
      (err.message.startsWith("Cannot confirm payment") ||
        err.message === "Insufficient wallet balance")
    ) {
      return badRequest(err.message)
    }
    return serverError(err)
  }
}
