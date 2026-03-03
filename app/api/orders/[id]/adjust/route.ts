import { type NextRequest } from "next/server"
import { requireScope } from "@/lib/api/auth"
import { adjustRequired } from "@/lib/services/orderService"
import { ok, badRequest, notFound, serverError, isPrismaNotFound } from "@/lib/api/response"
import type { IdParams } from "@/lib/api/types"

// POST /api/orders/:id/adjust — adjust the required amount (orders:adjust:write)
export async function POST(req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("orders:adjust:write")
  if (!caller.ok) return caller.response

  try {
    const { id } = await params
    const body = (await req.json()) as Record<string, unknown>

    const newRequiredRub = body.newRequiredRub
    if (
      newRequiredRub == null ||
      (typeof newRequiredRub !== "string" && typeof newRequiredRub !== "number")
    ) {
      return badRequest("newRequiredRub is required")
    }

    const reason = body.reason
    if (typeof reason !== "string" || !reason.trim()) {
      return badRequest("reason is required")
    }

    const order = await adjustRequired({ orderId: id, newRequiredRub, reason, actor: caller.role, actorId: caller.userId, actorName: caller.actorName })
    return ok(order)
  } catch (err) {
    if (isPrismaNotFound(err)) return notFound("Order not found")
    if (err instanceof Error && err.message.startsWith("Cannot adjust")) {
      return badRequest(err.message)
    }
    return serverError(err)
  }
}
