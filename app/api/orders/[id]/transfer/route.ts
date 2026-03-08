import { type NextRequest } from "next/server"
import { requireScope } from "@/lib/api/auth"
import { transferOrder } from "@/lib/services/orderService"
import { ok, badRequest, notFound, serverError, isPrismaNotFound } from "@/lib/api/response"
import type { IdParams } from "@/lib/api/types"

export async function POST(req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("orders:transfer")
  if (!caller.ok) return caller.response

  const { id } = await params
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null

  if (!body) return badRequest("Request body is required")

  const targetUserId = body.targetUserId
  if (typeof targetUserId !== "string" || !targetUserId.trim())
    return badRequest("targetUserId is required")

  const reason = body.reason
  if (typeof reason !== "string" || !reason.trim())
    return badRequest("reason is required")

  try {
    const order = await transferOrder({
      orderId: id,
      targetUserId: targetUserId.trim(),
      reason: reason.trim(),
      actor: caller.role,
      actorId: caller.userId,
      actorName: caller.actorName,
    })
    return ok(order)
  } catch (err) {
    if (isPrismaNotFound(err)) return notFound("Order not found")
    if (err instanceof Error && err.message.startsWith("Cannot transfer"))
      return badRequest(err.message)
    return serverError(err)
  }
}
