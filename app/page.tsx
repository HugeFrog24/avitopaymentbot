import Link from "next/link"
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  RefreshCw,
  MessageCircle,
  CreditCard,
  Check,
} from "lucide-react"

const POPULAR_SERVICES = [
  "Spotify", "Netflix", "ChatGPT Plus", "YouTube Premium",
  "Adobe Creative Cloud", "GitHub Copilot", "Midjourney", "Xbox Game Pass",
  "Disney+", "Notion", "Figma", "Apple Music",
  "PlayStation Plus", "Duolingo", "Perplexity Pro", "Claude Pro",
]

const STEPS = [
  {
    n: "01",
    title: "Submit your order",
    body: "Specify the service, plan, and your account details. The form takes under a minute to fill out.",
  },
  {
    n: "02",
    title: "Get a fixed quote",
    body: "We confirm availability and lock in the exchange rate. You receive the exact RUB amount — no surprises.",
  },
  {
    n: "03",
    title: "Pay and receive",
    body: "Transfer the amount to our details. We handle the payment and deliver card details or access confirmation.",
  },
]

const FEATURES = [
  {
    icon: RefreshCw,
    title: "Rate locked at quote",
    body: "The exchange rate is frozen when we confirm your order. Market fluctuations after that are our problem, not yours.",
  },
  {
    icon: ShieldCheck,
    title: "Manual payment verification",
    body: "Every payment is confirmed by a real person before delivery. No automated systems that can fail silently.",
  },
  {
    icon: Zap,
    title: "Same-day processing",
    body: "Most orders are handled within hours. You get a status update at every step of the way.",
  },
  {
    icon: Globe,
    title: "Any foreign platform",
    body: "If your card is declined abroad, we step in. We support payment methods unavailable in Russia.",
  },
  {
    icon: CreditCard,
    title: "Transparent service fee",
    body: "One flat fee, declared upfront. The amount you see on the quote is the amount you pay. No surprises.",
  },
  {
    icon: MessageCircle,
    title: "Telegram-first",
    body: "Order and communicate entirely via Telegram. No new accounts or foreign platforms needed on your side.",
  },
]

export default function Home() {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-950">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-8">
            <Check size={11} className="text-emerald-500" />
            Payment intermediary for digital subscriptions
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6 leading-[1.15]">
            Pay for any foreign<br className="hidden sm:block" /> digital subscription
          </h1>

          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Russian cards blocked abroad? We handle payments for Spotify, Netflix,
            ChatGPT, and hundreds of other services — so you don&apos;t have to.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium px-6 py-3 rounded-xl hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors text-sm"
            >
              Place an order
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/tos"
              className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Read terms of service →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Services strip ────────────────────────────────────────────────────── */}
      <section className="py-10 border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
        <p className="text-center text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
          Popular services we handle
        </p>
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap justify-center gap-2">
          {POPULAR_SERVICES.map((name) => (
            <span
              key={name}
              className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              How it works
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-sm">
              Three steps from request to delivery.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-7"
              >
                <div className="text-3xl font-bold text-zinc-200 dark:text-zinc-700 mb-5 font-mono tracking-tight">
                  {step.n}
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Built around trust
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-sm">
              No automation where it matters — every order is handled by a real person.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
              >
                <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <f.icon size={17} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5 text-sm">{f.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-zinc-900 dark:bg-zinc-100 rounded-2xl px-10 py-14 text-center">
            <h2 className="text-2xl font-bold text-white dark:text-zinc-900 mb-3 tracking-tight">
              Ready to get started?
            </h2>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
              Place your first order in under a minute. No account required — access your order via a personal link.
            </p>
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium px-6 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm"
            >
              Place an order
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
