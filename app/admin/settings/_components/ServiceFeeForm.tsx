"use client"

import { useState, useTransition } from "react"
import { updateServiceFeeAction } from "../actions"

const inputCls =
  "w-36 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm " +
  "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 tabular-nums " +
  "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 " +
  "focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"

export function ServiceFeeForm({ currentFee }: Readonly<{ currentFee: number }>) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const err = await updateServiceFeeAction(fd)
      if (err === null) {
        setSaved(true)
        setTimeout(() => { setSaved(false) }, 2000)
      } else {
        setError(err)
      }
    })
  }

  const buttonLabel = saved ? "Saved!" : "Save"

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Added on top of every converted order amount. Snapshot is taken at order creation —
        changing this does not affect existing orders.
      </p>
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          name="serviceFeeRub"
          type="number"
          min="0"
          step="0.01"
          defaultValue={currentFee}
          required
          className={inputCls}
        />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">₽</span>
        <button
          type="submit"
          disabled={isPending}
          className="bg-zinc-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : buttonLabel}
        </button>
      </form>
      {error != null && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}
