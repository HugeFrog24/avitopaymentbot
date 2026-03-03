"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Copy, Check } from "lucide-react"
import { OrderForm, type OrderFormResult } from "@/app/_components/OrderForm"

interface Props {
  isAdmin: boolean
  currencies: string[]
}

export function OrderNewClient({ isAdmin, currencies }: Readonly<Props>) {
  const router = useRouter()
  const [submitted, setSubmitted] = useState<OrderFormResult | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [copied, setCopied] = useState(false)

  function handleSuccess(result: OrderFormResult) {
    if (!isAdmin) {
      router.push(result.claimUrl)
      return
    }
    setSubmitted(result)
    setFormKey((k) => k + 1)
    globalThis.scrollTo({ top: 0, behavior: "smooth" })
  }

  function copyClaimUrl(claimUrl: string) {
    void navigator.clipboard.writeText(globalThis.location.origin + claimUrl)
    setCopied(true)
    setTimeout(() => { setCopied(false) }, 2000)
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
      {/* ── Breadcrumb — admin only ── */}
      {isAdmin && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={13} />
          Orders
        </Link>
      )}

      {/* ── Success banner — admin only ── */}
      {submitted != null && (
        <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3.5">
          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Draft order created
              {submitted.form.serviceName === "" ? "" : ` — ${submitted.form.serviceName}`}
            </p>
            <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
              {submitted.form.clientHandle === "" ? "Guest client" : submitted.form.clientHandle}
              {submitted.form.tariff === "" ? "" : ` · ${submitted.form.tariff}`}
              {submitted.form.originalPrice === ""
                ? ""
                : ` · ${submitted.form.originalPrice} ${submitted.form.currency}`}
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <code className="flex-1 min-w-0 text-[11px] bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded px-2 py-1 font-mono truncate">
                {submitted.claimUrl}
              </code>
              <button
                type="button"
                onClick={() => { copyClaimUrl(submitted.claimUrl) }}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-emerald-500">
              Send this link to the client — no account needed to view their order.
            </p>
            <Link
              href={`/admin/orders/${submitted.orderId}`}
              className="mt-2 inline-block text-xs font-medium text-emerald-700 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-900 dark:hover:text-emerald-200"
            >
              View in dashboard →
            </Link>
          </div>
        </div>
      )}

      <OrderForm
        key={formKey}
        mode={isAdmin ? "admin" : "guest"}
        cancelHref={isAdmin ? "/admin" : "/"}
        currencies={currencies}
        onSuccess={handleSuccess}
      />
    </main>
  )
}
