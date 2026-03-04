import { NextResponse } from "next/server"
import { getActivePrivacyPolicy } from "@/lib/services/privacyPolicyService"

// Public — no auth required. Bot and web both use this to display the active Privacy Policy.
export async function GET() {
  const policy = await getActivePrivacyPolicy()
  if (!policy) return NextResponse.json({ error: "No active Privacy Policy" }, { status: 404 })
  return NextResponse.json(policy)
}
