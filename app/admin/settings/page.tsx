import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAdminPage } from "@/lib/api/auth"
import { getSettings } from "@/lib/services/settingsService"
import { ServiceFeeForm } from "./_components/ServiceFeeForm"

export default async function SettingsPage() {
  await requireAdminPage()
  const settings = await getSettings()

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
            Settings
          </h1>
        </div>

        <div className="px-6 py-6">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
            Service fee
          </p>
          <ServiceFeeForm currentFee={settings.serviceFeeRub.toNumber()} />
        </div>
      </div>
    </main>
  )
}
