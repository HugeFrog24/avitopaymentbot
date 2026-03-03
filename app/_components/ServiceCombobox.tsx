"use client"

import { useState, useRef, useEffect, useId } from "react"
import { Search, ChevronDown } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Suggestion { name: string; category: string; currency: string; tariff: string | null }

// Subset of the ServiceSuggestion model returned by GET /api/services
interface ApiSuggestion {
  name: string
  category: string | null
  defaultCurrency: string | null
  defaultTariff: string | null
}

// ── Highlight matching substring ──────────────────────────────────────────────

function HighlightMatch({ text, query }: Readonly<{ text: string; query: string }>) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{text.slice(idx, idx + q.length)}</strong>
      {text.slice(idx + q.length)}
    </>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export type SelectedSuggestion = Pick<Suggestion, "name" | "currency" | "tariff">

interface Props {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onSelect: (item: SelectedSuggestion) => void
  readonly id?: string
}

export function ServiceCombobox({ value, onChange, onSelect, id }: Readonly<Props>) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-list`

  // Fetch from /api/services, debounced for non-empty queries
  useEffect(() => {
    const q = value.trim()
    const url =
      q.length > 0 ? `/api/services?q=${encodeURIComponent(q)}&limit=12` : `/api/services?limit=12`

    const controller = new AbortController()
    async function doFetch() {
      setLoading(true)
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) return
        const data = (await res.json()) as ApiSuggestion[]
        setSuggestions(
          data.map((s) => ({
            name: s.name,
            category: s.category ?? "Other",
            currency: s.defaultCurrency ?? "USD",
            tariff: s.defaultTariff,
          })),
        )
      } catch {
        // AbortError or network error — leave stale data
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(() => { void doFetch() }, q.length > 0 ? 180 : 0)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  // Group by category, preserving API order
  const grouped = suggestions.reduce<{ category: string; items: Suggestion[] }[]>((acc, item) => {
    const group = acc.find((g) => g.category === item.category)
    if (group == null) {
      acc.push({ category: item.category, items: [item] })
    } else {
      group.items.push(item)
    }
    return acc
  }, [])

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current == null) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => { document.removeEventListener("mousedown", onMouseDown); }
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || listRef.current == null) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true)
        setActiveIdx(0)
        e.preventDefault()
      }
      return
    }
    if (e.key === "ArrowDown") {
      setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1))
      e.preventDefault()
    } else if (e.key === "ArrowUp") {
      setActiveIdx((prev) => Math.max(prev - 1, -1))
      e.preventDefault()
    } else if (e.key === "Enter") {
      const activeSuggestion = suggestions.at(activeIdx)
      if (activeIdx >= 0 && activeSuggestion != null) {
        commitSelection(activeSuggestion)
      }
      e.preventDefault()
    } else if (e.key === "Escape") {
      setOpen(false)
      setActiveIdx(-1)
    }
  }

  function commitSelection(item: Suggestion) {
    onSelect({ name: item.name, currency: item.currency, tariff: item.tariff })
    onChange(item.name)
    setOpen(false)
    setActiveIdx(-1)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* ── Input ── */}
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
            setActiveIdx(-1)
          }}
          onFocus={() => { setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Spotify, Netflix, ChatGPT…"
          className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
        />
        <ChevronDown
          size={14}
          className={`absolute right-3 text-zinc-400 dark:text-zinc-500 pointer-events-none transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* ── Dropdown — loading ── */}
      {open && loading && (
        <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg shadow-zinc-900/5 px-4 py-3">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Loading…</p>
        </div>
      )}

      {/* ── Dropdown — results ── */}
      {open && !loading && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg shadow-zinc-900/5 overflow-hidden">
          <ul ref={listRef} id={listId} className="max-h-64 overflow-y-auto py-1">
            {grouped.map(({ category, items }) => (
              <li key={category}>
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none">
                  {category}
                </p>
                {items.map((item) => {
                  const idx = suggestions.indexOf(item)
                  const isActive = idx === activeIdx
                  return (
                    <button
                      key={item.name}
                      type="button"
                      data-idx={idx}
                      onMouseDown={(e) => {
                        e.preventDefault() // keep input focus
                        commitSelection(item)
                      }}
                      onMouseEnter={() => { setActiveIdx(idx); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors duration-75 ${
                        isActive ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="text-zinc-700 dark:text-zinc-300">
                        <HighlightMatch text={item.name} query={value} />
                        {item.tariff != null && (
                          <span className="ml-1.5 text-zinc-400 dark:text-zinc-500">· {item.tariff}</span>
                        )}
                      </span>
                      <span className="ml-3 text-[10px] font-mono font-medium text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                        {item.currency}
                      </span>
                    </button>
                  )
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Dropdown — no results ── */}
      {open && !loading && value.trim() !== "" && suggestions.length === 0 && (
        <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg shadow-zinc-900/5 px-4 py-3">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            No suggestions — you can still type a custom service name.
          </p>
        </div>
      )}
    </div>
  )
}
