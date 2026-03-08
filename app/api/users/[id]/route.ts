import { type NextRequest } from "next/server"
import { requireScope, hasScope } from "@/lib/api/auth"
import { prisma } from "@/lib/db/prisma"
import { ok, badRequest, forbidden, notFound, conflict, serverError } from "@/lib/api/response"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client"
import type { IdParams } from "@/lib/api/types"

// Returns the normalised value, null (clear), undefined (field absent), or an error string.
function parseStringField(
  body: Record<string, unknown>,
  key: string,
  maxLen = 64,
): { value: string | null | undefined; error?: never } | { value?: never; error: string } {
  const raw = body[key]
  if (raw === undefined) return { value: undefined }
  if (raw !== null && typeof raw !== "string") return { error: `${key} must be a string or null` }
  const trimmed = typeof raw === "string" ? raw.trim() || null : null
  if (trimmed !== null && trimmed.length > maxLen) return { error: `${key} must be ${maxLen} characters or fewer` }
  return { value: trimmed }
}

function mapPrismaError(err: unknown) {
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2025") return notFound("User not found")
    if (err.code === "P2002") return conflict("Handle is already taken")
  }
  return serverError(err)
}

// PATCH /api/users/:id — update own (or any) user's handle and/or name
// CLIENT: own profile only. ADMIN + BOT: any user.
export async function PATCH(req: NextRequest, { params }: IdParams) {
  const caller = await requireScope("users:write:own", "users:write:all")
  if (!caller.ok) return caller.response

  const { id } = await params

  if (!hasScope(caller, "users:write:all") && caller.userId !== id) return forbidden()

  const body = (await req.json()) as Record<string, unknown>

  const parsedHandle = parseStringField(body, "handle")
  if (parsedHandle.error) return badRequest(parsedHandle.error)

  const parsedName = parseStringField(body, "name")
  if (parsedName.error) return badRequest(parsedName.error)

  const { value: handle } = parsedHandle
  const { value: name } = parsedName

  if (handle === undefined && name === undefined) {
    return badRequest("at least one of handle or name is required")
  }

  const data: { handle?: string | null; name?: string | null } = {}
  if (handle !== undefined) data.handle = handle
  if (name !== undefined) data.name = name

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, handle: true, name: true },
    })
    return ok(user)
  } catch (err) {
    return mapPrismaError(err)
  }
}
