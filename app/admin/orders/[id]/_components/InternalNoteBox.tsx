"use client"

import { useState, useTransition } from "react"
import { saveInternalNoteAction } from "../actions"

export function InternalNoteBox({
  orderId,
  initialNote,
}: Readonly<{ orderId: string; initialNote: string | null }>) {
  const [note, setNote] = useState(initialNote ?? "")
  const [savedNote, setSavedNote] = useState(initialNote ?? "")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isDirty = note !== savedNote

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const err = await saveInternalNoteAction(orderId, null, fd)
      if (err == null) {
        setSavedNote(note)
      } else {
        setError(err)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        name="internalNote"
        value={note}
        onChange={(e) => { setNote(e.target.value) }}
        rows={3}
        placeholder="Private note — never shown to clients…"
        className={
          "w-full text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-2 " +
          "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 " +
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
          "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 resize-none"
        }
      />
      {isDirty && (
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-zinc-900 text-white text-xs font-medium py-1.5 rounded-md hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : "Save note"}
        </button>
      )}
      {error != null && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </form>
  )
}
