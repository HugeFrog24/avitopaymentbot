import Link from "next/link"
import { Plus, LayoutDashboard } from "lucide-react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { resolveCaller, hasScope } from "@/lib/api/auth"
import { UserMenu } from "@/app/_components/UserMenu"

export async function AppHeader() {
  const session = await auth.api.getSession({ headers: await headers() })
  const caller = await resolveCaller()
  const isAdmin = caller.ok && hasScope(caller, "settings:write")
  const userId = caller.ok ? caller.userId : null
  const displayName = caller.ok
    ? (caller.actorName ?? session?.user.email ?? null)
    : null

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-zinc-900 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold tracking-tight">P</span>
          </div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">PaymentCRM</span>
        </Link>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3">
          {/* New order — always visible */}
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-1.5 bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Plus size={12} />
            New order
          </Link>

          {/* Session controls */}
          {session == null ? (
            <Link
              href="/login"
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Sign in
            </Link>
          ) : (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  <LayoutDashboard size={12} />
                  Dashboard
                </Link>
              )}
              <UserMenu userId={userId ?? ""} displayName={displayName ?? ""} isAdmin={isAdmin} />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
