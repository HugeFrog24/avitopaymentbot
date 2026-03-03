import { type NextRequest } from "next/server"
import { requireScope, hasScope } from "@/lib/api/auth"
import { prisma } from "@/lib/db/prisma"
import { ok, badRequest, forbidden, notFound, conflict, serverError } from "@/lib/api/response"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client"
import type { IdParams } from "@/lib/api/types"

// PATCH /api/users/:id — update own (or any) user's handle
// CLIENT: own profile only. ADMIN + BOT: any user.
export async function PATCH(req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("users:write:own", "users:write:all")
  if (!caller.ok) return caller.response

  const { id } = await params

  if (!hasScope(caller, "users:write:all") && caller.userId !== id) return forbidden()

  const body = (await req.json()) as Record<string, unknown>
  const raw = body.handle

  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    return badRequest("handle must be a string or null")
  }

  // Normalise: null clears the handle; string is trimmed and validated
  let handle: string | null = null
  if (typeof raw === "string") {
    handle = raw.trim()
    if (handle === "") {
      handle = null
    } else if (handle.length > 64) {
      return badRequest("handle must be 64 characters or fewer")
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { handle },
      select: { id: true, handle: true },
    })
    return ok(user)
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025") return notFound("User not found")
      if (err.code === "P2002") return conflict("Handle is already taken")
    }
    return serverError(err)
  }
}
