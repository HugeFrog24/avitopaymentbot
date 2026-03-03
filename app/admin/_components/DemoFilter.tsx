import Link from "next/link"

export type DemoMode = "all" | "exclude" | "only"

const OPTIONS: { mode: DemoMode; label: string; href: string }[] = [
  { mode: "all", label: "All", href: "/admin" },
  { mode: "exclude", label: "Real only", href: "/admin?demo=exclude" },
  { mode: "only", label: "Demo only", href: "/admin?demo=only" },
]

export function DemoFilter({ current }: Readonly<{ current: DemoMode }>) {
  return (
    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
      {OPTIONS.map(({ mode, label, href }) => (
        <Link
          key={mode}
          href={href}
          className={
            current === mode
              ? "px-3 py-1 text-xs font-medium rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "px-3 py-1 text-xs font-medium rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          }
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
