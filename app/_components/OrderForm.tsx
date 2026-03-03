"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { ServiceCombobox } from "@/app/_components/ServiceCombobox"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderFormState {
  serviceName: string
  tariff: string
  clientHandle: string
  originalPrice: string
  currency: string
}

const EMPTY: OrderFormState = {
  serviceName: "",
  tariff: "",
  clientHandle: "",
  originalPrice: "",
  currency: "USD",
}

const CURRENCIES = ["USD", "EUR", "GBP", "TRY", "PLN", "AED"]

export interface OrderFormResult {
  orderId: string
  claimUrl: string
  form: OrderFormState
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface OrderFormProps {
  /** "admin" → admin creates on behalf of client; "guest" → client self-service */
  mode: "admin" | "guest"
  /** href for the cancel / back link */
  cancelHref: string
  onSuccess: (result: OrderFormResult) => void
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm " +
  "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 " +
  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
  "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 " +
  "focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"

const labelCls = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5"

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderForm({ mode, cancelHref, onSuccess }: Readonly<OrderFormProps>) {
  const [form, setForm] = useState<OrderFormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isAdmin = mode === "admin"

  function set<K extends keyof OrderFormState>(key: K, value: OrderFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const snapshot = form
    startTransition(async () => {
      // Ensure an authenticated session exists before creating the order.
      // For guest submissions, create an anonymous BetterAuth session so the
      // user has a real identity they can later claim with an email/OAuth link.
      if (!isAdmin) {
        const { data: session } = await authClient.getSession()
        if (!session) await authClient.signIn.anonymous()
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientHandle: snapshot.clientHandle.trim() || undefined,
          serviceName: snapshot.serviceName || undefined,
          tariff: snapshot.tariff || undefined,
          originalPrice: snapshot.originalPrice || undefined,
          originalCurrency: snapshot.currency,
        }),
      })
      const data = (await res.json()) as { id?: string; claimUrl?: string; error?: string }
      if (!res.ok || !data.id || !data.claimUrl) {
        setError(data.error ?? "Failed to create order")
        return
      }
      onSuccess({ orderId: data.id, claimUrl: data.claimUrl, form: snapshot })
    })
  }

  const submitLabel = isAdmin ? "Create draft" : "Submit order"

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {/* ── Card header ── */}
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          {isAdmin ? "New Order" : "Order inquiry"}
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          {isAdmin
            ? "Saved as DRAFT — no payment or delivery until approved"
            : "Submit your request — you'll receive a tracking link immediately"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        {/* ── Service ── */}
        <div>
          <label htmlFor="serviceName" className={labelCls}>
            Service
          </label>
          <ServiceCombobox
            id="serviceName"
            value={form.serviceName}
            onChange={(v) => { set("serviceName", v) }}
            onSelect={({ name, currency, tariff }) => {
              setForm((prev) => ({ ...prev, serviceName: name, currency, tariff: tariff ?? "" }))
            }}
          />
        </div>

        {/* ── Handle + Tariff ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="clientHandle" className={labelCls}>
              {isAdmin ? "Client handle" : "Your handle"}{" "}
              <span className="normal-case font-normal text-zinc-400 dark:text-zinc-500">(optional)</span>
            </label>
            <input
              id="clientHandle"
              type="text"
              value={form.clientHandle}
              onChange={(e) => { set("clientHandle", e.target.value) }}
              placeholder={isAdmin ? "@username" : "@telegram or your name"}
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="tariff" className={labelCls}>
              Tariff / Plan{" "}
              <span className="normal-case font-normal text-zinc-400 dark:text-zinc-500">(optional)</span>
            </label>
            <input
              id="tariff"
              type="text"
              value={form.tariff}
              onChange={(e) => { set("tariff", e.target.value) }}
              placeholder="e.g. Premium Individual"
              className={inputCls}
            />
          </div>
        </div>

        {/* ── Price + Currency ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label htmlFor="originalPrice" className={labelCls}>
              Original price{" "}
              <span className="normal-case font-normal text-zinc-400 dark:text-zinc-500">(optional)</span>
            </label>
            <input
              id="originalPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.originalPrice}
              onChange={(e) => { set("originalPrice", e.target.value) }}
              placeholder="0.00"
              className={`${inputCls} tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor="currency" className={labelCls}>
              Currency
            </label>
            <select
              id="currency"
              value={form.currency}
              onChange={(e) => { set("currency", e.target.value) }}
              className={`${inputCls} cursor-pointer`}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Error ── */}
        {error != null && <p className="text-xs text-red-500">{error}</p>}

        {/* ── Actions ── */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Link
            href={cancelHref}
            className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center bg-zinc-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-zinc-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Creating…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
