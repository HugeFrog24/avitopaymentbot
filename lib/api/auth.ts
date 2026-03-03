import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { unauthorized, forbidden } from "@/lib/api/response"
import type { NextResponse } from "next/server"
import type { Role } from "@/lib/generated/prisma/client"

// ── Types ──────────────────────────────────────────────────────────────────────

export type CallerRole = "ADMIN" | "BOT" | "CLIENT"

interface CallerOk {
  ok: true
  role: CallerRole
  userId: string | null
  actorName: string | null
  /**
   * When present, overrides ROLE_SCOPES[role] for hasScope() checks.
   * Today this is never populated (all bot keys share ROLE_SCOPES["BOT"]).
   * Future: populate from per-key metadata to support restricted tokens.
   */
  customScopes?: readonly Scope[]
}
interface CallerErr { ok: false; response: NextResponse }
export type CallerResult = CallerOk | CallerErr

// ── Scopes ────────────────────────────────────────────────────────────────────

export const SCOPES = [
  "orders:create",          // POST /api/orders              (own identity)
  "orders:create:behalf",   // POST /api/orders              (on behalf of another — mints anonymous if no body.userId)
  "orders:list:own",        // GET  /api/orders              (own only)
  "orders:list:all",        // GET  /api/orders              (any user)
  "orders:read:own",        // GET  /api/orders/:id          (own only)
  "orders:read:all",        // GET  /api/orders/:id          (any)
  "orders:write:own",       // PATCH /api/orders/:id         (own only)
  "orders:write:all",       // PATCH /api/orders/:id         (any)
  "orders:status:write",    // POST /api/orders/:id/status
  "orders:payments:write",  // POST /api/orders/:id/payments
  "orders:adjust:write",    // POST /api/orders/:id/adjust
  "orders:rate:write",      // POST /api/orders/:id/rate
  "wallet:read:own",        // GET  /api/users/:id/wallet    (own only)
  "wallet:read:all",        // GET  /api/users/:id/wallet    (any)
  "wallet:topup",           // POST /api/users/:id/wallet/topup
  "users:read:all",         // GET  /users/:id               (any user — admin/bot)
  "users:write:own",        // PATCH /api/users/:id          (own profile only)
  "users:write:all",        // PATCH /api/users/:id          (any user — admin/bot)
  "settings:write",         // server action: update service fee (ADMIN only)
] as const

export type Scope = (typeof SCOPES)[number]

// Single source of truth for what each role can do.
// ROLE_SCOPES["BOT"] is also the default scope template used when creating a new API key.
export const ROLE_SCOPES: Record<CallerRole, readonly Scope[]> = {
  ADMIN: [...SCOPES],
  BOT: [
    "orders:create",
    "orders:create:behalf",
    "orders:list:all",
    "orders:read:all",
    "orders:write:all",
    "orders:status:write",
    "wallet:read:all",
    "users:read:all",
    "users:write:all",
  ],
  CLIENT: [
    "orders:create",
    "orders:list:own",
    "orders:read:own",
    "orders:write:own",
    "wallet:read:own",
    "users:write:own",
  ],
}

/**
 * Returns true if the caller holds the given scope.
 * Use after resolveCaller() to branch on ownership-sensitive paths.
 * When the caller carries customScopes, those are checked instead of ROLE_SCOPES[role].
 */
export function hasScope(
  caller: Extract<CallerResult, { ok: true }>,
  scope: Scope,
): boolean {
  const scopes = caller.customScopes ?? ROLE_SCOPES[caller.role]
  return (scopes as readonly string[]).includes(scope)
}

/**
 * Resolves the caller and checks they hold at least one of the listed scopes.
 * Returns 401/403 on failure. Pass multiple scopes when different capability
 * levels reach the same endpoint (e.g. "orders:read:own", "orders:read:all").
 */
export async function requireScope(
  first: Scope,
  ...rest: Scope[]
): Promise<CallerResult> {
  const caller = await resolveCaller()
  if (!caller.ok) return caller
  if (![first, ...rest].some((s) => hasScope(caller, s))) {
    return { ok: false, response: forbidden() }
  }
  return caller
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Reads the session, DB role, and display name in one query. */
async function getSessionUser(): Promise<{ id: string; role: Role; actorName: string | null } | null> {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  if (!session) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, handle: true, name: true },
  })
  return {
    id: session.user.id,
    role: user?.role ?? "CLIENT",
    actorName: user?.handle ?? user?.name ?? null,
  }
}

/**
 * Validates the X-Bot-Api-Key header against the BetterAuth API key store.
 * Returns the key's name (for actorName) on success, null if absent or invalid.
 */
async function getBotKey(): Promise<{ name: string | null } | null> {
  const h = await headers()
  const key = h.get("x-bot-api-key")
  if (!key) return null

  const result = await auth.api.verifyApiKey({ body: { key } })
  if (!result.valid || !result.key) return null

  return { name: result.key.name ?? null }
}

// ── Server-component guard ─────────────────────────────────────────────────────

/**
 * Use at the top of admin server-component pages.
 * Redirects to /login if the session is missing or not ADMIN.
 * Returns the authenticated userId.
 */
export async function requireAdminPage(): Promise<string> {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "ADMIN") redirect("/login")
  return user.id
}

// ── API route handler guards ───────────────────────────────────────────────────

/**
 * Resolves the caller's role and identity from the current request context.
 *
 * - BOT   : valid X-Bot-Api-Key header (verified against DB via BetterAuth API key plugin)
 * - ADMIN : authenticated BetterAuth session with DB role ADMIN
 * - CLIENT: authenticated BetterAuth session with any other role
 *
 * Returns 401 if no valid authentication is present.
 */
export async function resolveCaller(): Promise<CallerResult> {
  const botKey = await getBotKey()
  if (botKey !== null) {
    return {
      ok: true,
      role: "BOT",
      userId: null,
      actorName: botKey.name,
    }
  }

  const user = await getSessionUser()
  if (!user) return { ok: false, response: unauthorized() }

  return {
    ok: true,
    role: user.role === "ADMIN" ? "ADMIN" : "CLIENT",
    userId: user.id,
    actorName: user.actorName,
  }
}
