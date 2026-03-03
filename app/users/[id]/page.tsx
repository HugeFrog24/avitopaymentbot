import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { headers } from "next/headers"
import type { WalletTxType } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth"
import { resolveCaller, hasScope } from "@/lib/api/auth"
import { getWalletWithTransactions } from "@/lib/services/walletService"
import { UserAvatar } from "@/app/_components/UserAvatar"
import { HandleEditor } from "./_components/HandleEditor"

// ── Formatters ────────────────────────────────────────────────────────────────

const rubFmt = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const SHORT_DATETIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

// ── Wallet transaction type label + colour ────────────────────────────────────

const TX_META: Record<WalletTxType, { label: string; cls: string }> = {
  TOPUP:       { label: "Top-up",       cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  REFUND:      { label: "Refund",       cls: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  ORDER_DEBIT: { label: "Order debit",  cls: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  ADJUSTMENT:  { label: "Adjustment",   cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
}

const ROLE_CLS: Record<string, string> = {
  ADMIN: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  BOT:   "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  CLIENT: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function UserPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (session == null) redirect("/login")

  const [user, wallet, lastSession, account, activeSessionCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        handle: true,
        name: true,
        email: true,
        emailVerified: true,
        telegramId: true,
        role: true,
        isDemo: true,
        createdAt: true,
      },
    }),
    getWalletWithTransactions(id),
    prisma.session.findFirst({
      where: { userId: id },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.account.findFirst({
      where: { userId: id },
      select: { providerId: true },
    }),
    prisma.session.count({
      where: { userId: id, expiresAt: { gt: new Date() } },
    }),
  ])

  if (user == null) notFound()

  const isOwnProfile = session.user.id === id
  const caller = await resolveCaller()
  const canViewAny = caller.ok && hasScope(caller, "users:read:all")
  if (!isOwnProfile && !canViewAny) notFound()
  const isAdmin = canViewAny
  const balanceRub = wallet?.balanceRub.toNumber() ?? 0

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 space-y-5">
      {isAdmin && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={13} />
          Dashboard
        </Link>
      )}

      {/* ── Profile card ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
          <div className="shrink-0 rounded-full overflow-hidden">
            <UserAvatar userId={user.id} size={40} />
          </div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex-1">
            {user.handle ?? user.email ?? user.name ?? "Unknown user"}
          </h1>
          {user.isDemo && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              Demo
            </span>
          )}
          <span
            className={
              "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full " +
              (ROLE_CLS[user.role] ?? ROLE_CLS.CLIENT)
            }
          >
            {user.role}
          </span>
        </div>

        <dl className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">
              Handle
            </dt>
            <dd className="text-sm">
              {isOwnProfile || isAdmin
                ? <HandleEditor userId={user.id} initialHandle={user.handle} />
                : <span className={user.handle == null ? "text-zinc-300 dark:text-zinc-600" : "font-mono"}>{user.handle ?? "—"}</span>
              }
            </dd>
          </div>
          <ProfileRow label="Display name" value={user.name} />
          <ProfileRow label="Email" value={<EmailCell email={user.email} verified={user.emailVerified} />} />
          <ProfileRow label="Login method" value={
            account == null ? null : formatProvider(account.providerId)
          } />
          <ProfileRow label="Telegram ID" value={user.telegramId} />
          <ProfileRow label="Last active" value={
            lastSession == null ? null : SHORT_DATETIME.format(lastSession.updatedAt)
          } />
          <ProfileRow label="Active sessions" value={activeSessionCount === 0 ? null : String(activeSessionCount)} />
          <ProfileRow label="Member since" value={SHORT_DATE.format(user.createdAt)} />
          <ProfileRow label="User ID" value={<span className="font-mono text-[11px]">{user.id}</span>} />
        </dl>
      </div>

      <WalletCard wallet={wallet} balanceRub={balanceRub} />
    </main>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type WalletData = Awaited<ReturnType<typeof getWalletWithTransactions>>

function WalletCard({ wallet, balanceRub }: Readonly<{ wallet: WalletData; balanceRub: number }>) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-baseline gap-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex-1">
          Wallet
        </h2>
        <span
          className={
            "text-xl font-semibold tabular-nums " +
            (balanceRub > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-zinc-400 dark:text-zinc-500")
          }
        >
          {rubFmt.format(balanceRub)}
        </span>
      </div>

      {wallet == null || wallet.transactions.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
          No transactions yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/60">
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wide text-zinc-400 dark:text-zinc-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-zinc-400 dark:text-zinc-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium tracking-wide text-zinc-400 dark:text-zinc-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-zinc-400 dark:text-zinc-500 uppercase">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {wallet.transactions.map((tx) => {
                const meta = TX_META[tx.type]
                const amount = tx.amountRub.toNumber()
                return (
                  <tr key={tx.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/70 transition-colors duration-100">
                    <td className="px-6 py-3 text-xs text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                      {SHORT_DATE.format(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                    </td>
                    <td
                      className={
                        "px-4 py-3 text-right font-medium tabular-nums " +
                        (amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")
                      }
                    >
                      {amount >= 0 ? "+" : ""}
                      {rubFmt.format(amount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                      {tx.note ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {wallet.transactions.length === 50 && (
            <p className="px-6 py-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
              Showing last 50 transactions.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function EmailCell({ email, verified }: Readonly<{ email: string | null; verified: boolean }>) {
  if (email == null) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      {email}
      <span
        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
          verified
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
        }`}
      >
        {verified ? "Verified" : "Unverified"}
      </span>
    </span>
  )
}

function formatProvider(providerId: string): string {
  if (providerId === "credential") return "Email / password"
  return providerId.charAt(0).toUpperCase() + providerId.slice(1)
}

function ProfileRow({
  label,
  value,
}: Readonly<{ label: string; value: string | number | React.ReactNode | null | undefined }>) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">
        {value == null || value === "" ? (
          <span className="text-zinc-300 dark:text-zinc-600">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
