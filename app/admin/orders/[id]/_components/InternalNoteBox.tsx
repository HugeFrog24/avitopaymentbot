"use client"

import { useState, useTransition } from "react"
import { saveInternalNoteAction } from "../actions"

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

export function InternalNoteBox({
  orderId,
  initialNote,
  initialUpdatedAt,
  initialEditorName,
}: Readonly<{
  orderId: string
  initialNote: string | null
  initialUpdatedAt: Date | null
  initialEditorName: string | null
}>) {
  const [savedNote, setSavedNote] = useState(initialNote ?? "")
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const [draft, setDraft] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function startEditing() {
    setDraft(savedNote)
    setError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setError(null)
  }

  function handleDelete() {
    setError(null)
    const fd = new FormData()
    fd.append("internalNote", "")
    startTransition(async () => {
      const err = await saveInternalNoteAction(orderId, null, fd)
      if (err == null) {
        setSavedNote("")
        setUpdatedAt(new Date())
      } else {
        setError(err)
      }
    })
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const err = await saveInternalNoteAction(orderId, null, fd)
      if (err == null) {
        setSavedNote(draft)
        setUpdatedAt(new Date())
        setIsEditing(false)
      } else {
        setError(err)
      }
    })
  }

  if (!isEditing) {
    return (
      <div className="space-y-2">
        {savedNote ? (
          <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
            {savedNote}
          </p>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No note</p>
        )}
        {updatedAt != null && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {"Last updated " + DATE_FMT.format(updatedAt)}
            {initialEditorName != null && " by " + initialEditorName}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startEditing}
            disabled={isPending}
            className="flex-1 text-xs font-medium py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savedNote ? "Edit" : "Add"}
          </button>
          {savedNote && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 text-xs font-medium py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        name="internalNote"
        value={draft}
        onChange={(e) => { setDraft(e.target.value) }}
        rows={3}
        autoFocus
        placeholder="Private note — never shown to clients…"
        className={
          "w-full text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-2 " +
          "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 " +
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
          "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 resize-none"
        }
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-zinc-900 text-white text-xs font-medium py-1.5 rounded-md hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={isPending}
          className="flex-1 text-xs font-medium py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
      {error != null && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </form>
  )
}
