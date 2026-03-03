import type { LucideIcon } from "lucide-react"

interface Props {
  label: string
  value: string
  icon: LucideIcon
  iconClass?: string
  valueClass?: string
}

export function StatCard({ label, value, icon: Icon, iconClass, valueClass }: Readonly<Props>) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
          {label}
        </span>
        <Icon size={16} className={iconClass} />
      </div>
      <p className={`text-2xl font-semibold tabular-nums ${valueClass ?? "text-zinc-900 dark:text-zinc-100"}`}>
        {value}
      </p>
    </div>
  )
}
