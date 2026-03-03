"use client"

import { useState, useTransition } from "react"
import { Mail } from "lucide-react"
import { authClient } from "@/lib/auth-client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: "/orders/my",
      })
      if (result.error) {
        setError(result.error.message ?? "Failed to send sign-in link")
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <main className="max-w-sm mx-auto px-6 py-24 text-center">
        <div className="mb-4 flex justify-center"><Mail size={28} className="text-zinc-400" /></div>
        <h1 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Check your email</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          If {email} is authorised, a sign-in link was sent. Check your inbox.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-24">
      <h1 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-6">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
          placeholder="your@email.com"
          required
          autoFocus
          className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
        />
        {error != null && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-zinc-900 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Sending…" : "Send magic link"}
        </button>
      </form>
    </main>
  )
}
