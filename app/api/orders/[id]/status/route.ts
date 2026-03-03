import { type NextRequest } from "next/server"
import { requireScope } from "@/lib/api/auth"
import { transitionStatus } from "@/lib/services/orderService"
import type { OrderStatus, EventActor } from "@/lib/generated/prisma/client"
import { ok, badRequest, notFound, serverError, isPrismaNotFound } from "@/lib/api/response"
import type { IdParams } from "@/lib/api/types"

// POST /api/orders/:id/status — transition FSM state (orders:status:write)
export async function POST(req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("orders:status:write")
  if (!caller.ok) return caller.response

  // Actor is derived from verified caller identity — never trusted from the request body.
  const actor: EventActor = caller.role

  try {
    const { id } = await params
    const body = (await req.json()) as Record<string, unknown>

    const newStatus = body.status
    if (typeof newStatus !== "string" || !newStatus) {
      return badRequest("status is required")
    }

    const message = typeof body.message === "string" ? body.message : undefined

    const order = await transitionStatus({
      orderId: id,
      newStatus: newStatus as OrderStatus,
      actor,
      actorId: caller.userId,
      actorName: caller.actorName,
      message,
    })

    return ok(order)
  } catch (err) {
    if (isPrismaNotFound(err)) return notFound("Order not found")
    if (err instanceof Error && err.message.startsWith("Invalid status transition")) {
      return badRequest(err.message)
    }
    return serverError(err)
  }
}
