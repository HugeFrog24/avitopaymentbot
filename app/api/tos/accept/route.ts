import { NextResponse, type NextRequest } from "next/server"
import { requireScope } from "@/lib/api/auth"
import { recordAcceptance } from "@/lib/services/tosService"

// POST /api/tos/accept
// Body: { tosVersionId: number, userId?: string }
//
// Web clients: userId comes from the session (caller.userId).
// Bot callers: pass userId in body (bot's own userId is null).
export async function POST(request: NextRequest) {
  const caller = await requireScope("tos:accept")
  if (!caller.ok) return caller.response

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const { tosVersionId, userId: bodyUserId } = body as { tosVersionId?: unknown; userId?: unknown }

  if (typeof tosVersionId !== "number" || !Number.isInteger(tosVersionId)) {
    return NextResponse.json({ error: "tosVersionId must be an integer" }, { status: 422 })
  }

  // Bot passes userId in body; session-based callers use their own identity.
  const resolvedUserId =
    caller.role === "BOT" && typeof bodyUserId === "string" && bodyUserId.length > 0
      ? bodyUserId
      : caller.userId

  if (!resolvedUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 422 })
  }

  try {
    await recordAcceptance(resolvedUserId, tosVersionId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record acceptance" },
      { status: 500 },
    )
  }
}
