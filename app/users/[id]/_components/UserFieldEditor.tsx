"use client"

import { useState, useRef, useEffect } from "react"
import { Pencil, Check, X } from "lucide-react"

interface Props {
  userId: string
  field: "handle" | "name"
  initialValue: string | null
  placeholder?: string
}

export function UserFieldEditor({ userId, field, initialValue, placeholder }: Readonly<Props>) {
  const [value, setValue] = useState<string | null>(initialValue)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEdit() {
    setDraft(value ?? "")
    setError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: draft.trim() || null }),
      })
      const data = (await res.json()) as Record<string, string | null> & { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Failed to save")
        return
      }
      setValue(data[field] ?? null)
      setEditing(false)
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { void save() }
    if (e.key === "Escape") { cancelEdit() }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => { setDraft(e.target.value) }}
            onKeyDown={handleKeyDown}
            maxLength={64}
            placeholder={placeholder}
            className="flex-1 min-w-0 border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-0.5 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
          />
          <button
            type="button"
            onClick={() => { void save() }}
            disabled={saving}
            aria-label={`Save ${field}`}
            className="p-1 rounded text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            aria-label="Cancel"
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        {error != null && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <span className={value == null ? "text-zinc-300 dark:text-zinc-600" : "text-sm text-zinc-900 dark:text-zinc-100"}>
        {value ?? "—"}
      </span>
      <button
        type="button"
        onClick={startEdit}
        aria-label={`Edit ${field}`}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all"
      >
        <Pencil size={11} />
      </button>
    </div>
  )
}
