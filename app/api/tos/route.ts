import { NextResponse } from "next/server"
import { getActiveTos } from "@/lib/services/tosService"

// Public — no auth required. Bot and web both use this to display the active ToS.
export async function GET() {
  const tos = await getActiveTos()
  if (!tos) return NextResponse.json({ error: "No active ToS" }, { status: 404 })
  return NextResponse.json(tos)
}
