"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownToLine } from "lucide-react"
import { confirmPaymentAction } from "../actions"

const inputCls =
  "w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm " +
  "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 " +
  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
  "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 " +
  "focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"

const labelCls = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1"

// ── Inner form ────────────────────────────────────────────────────────────────

function PaymentFields({
  idempotencyKey,
  onSubmit,
  isPending,
  remainingBalanceRub,
}: Readonly<{
  idempotencyKey: string
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void
  isPending: boolean
  remainingBalanceRub: number
}>) {
  const [amount, setAmount] = useState("")

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} readOnly />

      <div>
        <label htmlFor="payAmt" className={labelCls}>
          Amount ₽
        </label>
        <input
          id="payAmt"
          name="amountRub"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="0.00"
          value={amount}
          onChange={(e) => { setAmount(e.target.value) }}
          className={`${inputCls} tabular-nums`}
        />
        {remainingBalanceRub > 0 && (
          <button
            type="button"
            onClick={() => { setAmount(remainingBalanceRub.toFixed(2)) }}
            className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors tabular-nums"
          >
            <ArrowDownToLine size={12} />
            Fill remaining — {remainingBalanceRub.toLocaleString("ru-RU")} ₽
          </button>
        )}
      </div>

      <div>
        <label htmlFor="paySource" className={labelCls}>
          Source
        </label>
        <select id="paySource" name="source" className={`${inputCls} cursor-pointer`}>
          <option value="DIRECT">DIRECT — bank / cash</option>
          <option value="WALLET">WALLET — client wallet</option>
        </select>
      </div>

      <div>
        <label htmlFor="payNote" className={labelCls}>
          Note <span className="normal-case font-normal text-zinc-400 dark:text-zinc-500">(optional)</span>
        </label>
        <input
          id="payNote"
          name="note"
          type="text"
          placeholder="e.g. Sberbank ref #12345"
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-zinc-900 text-white text-xs font-medium py-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Confirming…" : "Confirm Payment"}
      </button>
    </form>
  )
}

// ── Outer: manages action state and triggers form reset on success ─────────────

export function ConfirmPaymentForm({
  orderId,
  remainingBalanceRub,
  initialIdempotencyKey,
}: Readonly<{ orderId: string; remainingBalanceRub: number; initialIdempotencyKey: string }>) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const err = await confirmPaymentAction(orderId, null, fd)
      if (err === null) {
        router.refresh()
      } else {
        setError(err)
      }
    })
  }

  return (
    <div className="space-y-2">
      <PaymentFields idempotencyKey={initialIdempotencyKey} onSubmit={handleSubmit} isPending={isPending} remainingBalanceRub={remainingBalanceRub} />
      {error != null && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}
