import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { headers } from "next/headers"
import { requireAdminPage } from "@/lib/api/auth"
import { auth } from "@/lib/auth"
import { ApiKeyManager } from "./_components/ApiKeyManager"

export default async function ApiKeysPage() {
  await requireAdminPage()

  const { apiKeys } = await auth.api.listApiKeys({
    query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
    headers: await headers(),
  })

  return (
    <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={13} />
        Dashboard
      </Link>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            API Keys
          </h1>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Bot API keys for headless service access. Keys are shown once — copy immediately after creation.
          </p>
        </div>

        <ApiKeyManager keys={apiKeys} />
      </div>
    </main>
  )
}
