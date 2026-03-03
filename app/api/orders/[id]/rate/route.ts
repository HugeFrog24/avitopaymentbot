import { type NextRequest } from "next/server"
import { requireScope } from "@/lib/api/auth"
import { freezeRate } from "@/lib/services/orderService"
import { ok, badRequest, notFound, serverError, isPrismaNotFound } from "@/lib/api/response"
import type { IdParams } from "@/lib/api/types"

// POST /api/orders/:id/rate — fetch live CBR rate and freeze it (orders:rate:write)
export async function POST(_req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("orders:rate:write")
  if (!caller.ok) return caller.response

  try {
    const { id } = await params
    const order = await freezeRate(id, caller.userId, caller.actorName, caller.role)
    return ok(order)
  } catch (err) {
    if (isPrismaNotFound(err)) return notFound("Order not found")
    if (err instanceof Error && err.message.startsWith("Cannot freeze rate")) {
      return badRequest(err.message)
    }
    return serverError(err)
  }
}
