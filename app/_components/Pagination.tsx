import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

export const PAGE_SIZES = [10, 25, 50] as const
export const DEFAULT_PAGE_SIZE = 25

/** Merges current URL params with overrides, returning a ?query string. */
export function buildUrl(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const merged: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v !== undefined) merged[k] = v
  }
  const qs = new URLSearchParams(merged).toString()
  return qs ? `?${qs}` : "?"
}

interface Props {
  total: number
  page: number
  pageSize: number
  params: Record<string, string | undefined>
}

export function Pagination({ total, page, pageSize, params }: Readonly<Props>) {
  if (total === 0) return null

  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  const prevHref = page > 1 ? buildUrl(params, { page: String(page - 1) }) : null
  const nextHref = page < totalPages ? buildUrl(params, { page: String(page + 1) }) : null

  const navBtn = "flex items-center justify-center h-7 w-7 rounded-md transition-colors"
  const navActive = `${navBtn} text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200`
  const navDisabled = `${navBtn} text-zinc-300 dark:text-zinc-700 cursor-default`

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 dark:border-zinc-800">
      {/* Count */}
      <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
        {from}–{to} of {total}
      </span>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1">Per page:</span>
          {PAGE_SIZES.map((size) => (
            <Link
              key={size}
              href={buildUrl(params, { pageSize: String(size), page: "1" })}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                size === pageSize
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {size}
            </Link>
          ))}
        </div>

        {/* Prev / page indicator / Next */}
        <div className="flex items-center gap-1">
          {prevHref === null ? (
            <span className={navDisabled} aria-disabled="true">
              <ChevronLeft size={14} />
            </span>
          ) : (
            <Link href={prevHref} className={navActive} aria-label="Previous page">
              <ChevronLeft size={14} />
            </Link>
          )}
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums w-16 text-center">
            {page} / {totalPages}
          </span>
          {nextHref === null ? (
            <span className={navDisabled} aria-disabled="true">
              <ChevronRight size={14} />
            </span>
          ) : (
            <Link href={nextHref} className={navActive} aria-label="Next page">
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
