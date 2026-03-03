"use client"

import { useState, useTransition } from "react"
import { adjustRequiredAction } from "../actions"

const inputCls =
  "w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm " +
  "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 " +
  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
  "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 " +
  "focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"

const labelCls = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1"

export function AdjustRequiredForm({ orderId }: Readonly<{ orderId: string }>) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formKey, setFormKey] = useState(0)

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const err = await adjustRequiredAction(orderId, null, fd)
      if (err === null) {
        setFormKey((k) => k + 1)
      } else {
        setError(err)
      }
    })
  }

  return (
    <div className="space-y-2">
      <form key={formKey} onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="adjAmount" className={labelCls}>
            New Required ₽
          </label>
          <input
            id="adjAmount"
            name="newRequiredRub"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            className={`${inputCls} tabular-nums`}
          />
        </div>

        <div>
          <label htmlFor="adjReason" className={labelCls}>
            Reason
          </label>
          <input
            id="adjReason"
            name="reason"
            type="text"
            required
            placeholder="e.g. VAT added at checkout"
            className={inputCls}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-zinc-900 text-white text-xs font-medium py-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : "Apply Adjustment"}
        </button>
      </form>
      {error != null && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}
