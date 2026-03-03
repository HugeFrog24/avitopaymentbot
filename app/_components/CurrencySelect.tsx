"use client"

import { useState, useRef, useEffect, useId } from "react"
import { ChevronDown } from "lucide-react"

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  currencies: string[]
}

const inputCls =
  "w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm " +
  "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 " +
  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
  "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 " +
  "focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"

export function CurrencySelect({ id, value, onChange, currencies }: Readonly<Props>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-list`

  const filtered = query
    ? currencies.filter((c) => c.includes(query.toUpperCase()))
    : currencies

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => { document.removeEventListener("mousedown", onMouseDown) }
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || listRef.current == null) return
    listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  function commit(code: string) {
    onChange(code)
    setQuery("")
    setOpen(false)
    setActiveIdx(-1)
  }

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
      setActiveIdx((prev) => Math.min(prev + 1, filtered.length - 1))
      e.preventDefault()
    } else if (e.key === "ArrowUp") {
      setActiveIdx((prev) => Math.max(prev - 1, -1))
      e.preventDefault()
    } else if (e.key === "Enter") {
      const item = filtered.at(activeIdx)
      if (activeIdx >= 0 && item !== undefined) commit(item)
      e.preventDefault()
    } else if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          value={open ? query : value}
          placeholder={open ? value : undefined}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActiveIdx(-1)
          }}
          onFocus={() => { setOpen(true) }}
          onKeyDown={handleKeyDown}
          className={`${inputCls} font-mono pr-7`}
        />
        <ChevronDown
          size={14}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg shadow-zinc-900/5 max-h-48 overflow-y-auto py-1"
        >
          {filtered.map((code, idx) => (
            <li key={code} role="option" aria-selected={idx === activeIdx}>
              <button
                type="button"
                data-idx={idx}
                onMouseDown={(e) => { e.preventDefault(); commit(code) }}
                onMouseEnter={() => { setActiveIdx(idx) }}
                className={`w-full text-left px-3 py-1.5 text-sm font-mono cursor-pointer transition-colors duration-75 ${
                  idx === activeIdx
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {code}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && filtered.length === 0 && (
        <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg shadow-zinc-900/5 px-3 py-2">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No match</p>
        </div>
      )}
    </div>
  )
}
