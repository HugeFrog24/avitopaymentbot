import { type NextRequest } from "next/server"
import { requireScope, hasScope } from "@/lib/api/auth"
import { getOrder, updateOrder } from "@/lib/services/orderService"
import { ok, badRequest, forbidden, notFound, serverError, isPrismaNotFound } from "@/lib/api/response"
import type { IdParams } from "@/lib/api/types"

// GET /api/orders/:id — orders:read:all see any order; orders:read:own see only their own
export async function GET(_req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("orders:read:own", "orders:read:all")
  if (!caller.ok) return caller.response

  try {
    const { id } = await params
    const order = await getOrder(id)

    if (!hasScope(caller, "orders:read:all") && order.userId !== caller.userId) return forbidden()

    return ok(order)
  } catch (err) {
    if (isPrismaNotFound(err)) return notFound("Order not found")
    return serverError(err)
  }
}

// PATCH /api/orders/:id — update service details (DRAFT / NEEDS_CLARIFICATION only)
// orders:write:all: any order. orders:write:own: own order only (service layer enforces status).
export async function PATCH(req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("orders:write:own", "orders:write:all")
  if (!caller.ok) return caller.response

  try {
    const { id } = await params

    if (!hasScope(caller, "orders:write:all")) {
      const existing = await getOrder(id).catch(() => null)
      if (!existing) return notFound("Order not found")
      if (existing.userId !== caller.userId) return forbidden()
    }

    const body = (await req.json()) as Record<string, unknown>

    const order = await updateOrder(id, {
      serviceName: typeof body.serviceName === "string" ? body.serviceName : undefined,
      tariff: typeof body.tariff === "string" ? body.tariff : undefined,
      duration: typeof body.duration === "string" ? body.duration : undefined,
      originalPrice:
        typeof body.originalPrice === "string" || typeof body.originalPrice === "number"
          ? body.originalPrice
          : undefined,
      originalCurrency:
        typeof body.originalCurrency === "string" ? body.originalCurrency : undefined,
    })

    return ok(order)
  } catch (err) {
    if (isPrismaNotFound(err)) return notFound("Order not found")
    if (err instanceof Error && err.message.includes("cannot be edited"))
      return badRequest(err.message)
    return serverError(err)
  }
}
