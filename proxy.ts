import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes the bot process is allowed to call (via X-Bot-Api-Key)
const BOT_PATHS = ["/api/orders", "/api/users"]

// Better Auth stores the session in this cookie (signed, tamper-proof).
// The proxy only checks presence — full validation happens in route handlers / server components.
const SESSION_COOKIE = "better-auth.session_token"

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/login"
  return NextResponse.redirect(loginUrl)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Better Auth callback routes must pass through without restriction
  if (pathname.startsWith("/api/auth/")) return NextResponse.next()

  // Anonymous order creation (guest-to-user backfill) — no session required
  if (pathname === "/api/orders" && request.method === "POST") return NextResponse.next()

  // ── UI routes that require a session ─────────────────────────────────────
  // /users/:id  — profile page (admin: any user; client: own profile only)
  // /admin/*    — admin dashboard (role check happens in each server component)
  const isProtectedPage =
    pathname.startsWith("/users") ||
    pathname === "/orders/my" ||
    pathname.startsWith("/admin")
  if (isProtectedPage) {
    const session = request.cookies.get(SESSION_COOKIE)?.value
    return session ? NextResponse.next() : redirectToLogin(request)
  }

  // ── API routes the bot may call (X-Bot-Api-Key or session cookie) ─────────
  if (BOT_PATHS.some((p) => pathname.startsWith(p))) {
    // Presence check only — full key validation happens in the route handler
    // (Edge Runtime cannot reach the database for a full verifyApiKey call).
    if (request.headers.has("x-bot-api-key")) {
      return NextResponse.next()
    }
    const session = request.cookies.get(SESSION_COOKIE)?.value
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/users/:path*", "/orders/:path*"],
}
