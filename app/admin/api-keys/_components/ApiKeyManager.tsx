"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Check, Trash2, KeyRound } from "lucide-react"
import type { ApiKey } from "@better-auth/api-key"
import { createApiKeyAction, revokeApiKeyAction } from "../actions"

type KeyRow = Omit<ApiKey, "key">

const btnPrimary =
  "bg-zinc-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-zinc-700 " +
  "disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-zinc-100 " +
  "dark:text-zinc-900 dark:hover:bg-zinc-300"

const btnDanger =
  "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 " +
  "transition-colors disabled:opacity-40 disabled:cursor-not-allowed"

export function ApiKeyManager({ keys }: Readonly<{ keys: KeyRow[] }>) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<{ id: string; key: string; name: string | null } | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNewKey(null)
    startTransition(async () => {
      const result = await createApiKeyAction(name)
      if (typeof result === "string") {
        setError(result)
      } else {
        setNewKey(result)
        setName("")
        router.refresh()
      }
    })
  }

  function handleRevoke(keyId: string) {
    setRevokingId(keyId)
    startTransition(async () => {
      const err = await revokeApiKeyAction(keyId)
      setRevokingId(null)
      if (err) {
        setError(err)
      } else {
        if (newKey?.id === keyId) setNewKey(null)
        router.refresh()
      }
    })
  }

  function copyKey() {
    if (!newKey) return
    void navigator.clipboard.writeText(newKey.key)
    setCopied(true)
    setTimeout(() => { setCopied(false); }, 2000)
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {/* Create new key */}
      <div className="px-6 py-5 space-y-4">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Create key
        </p>
        <form onSubmit={handleCreate} className="flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            placeholder="e.g. telegram-bot-prod"
            required
            className={
              "flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm " +
              "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 " +
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 " +
              "focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
            }
          />
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Creating…" : "Create"}
          </button>
        </form>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

        {/* One-time key reveal */}
        {newKey && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 p-4 space-y-2">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Copy this key now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 break-all text-zinc-900 dark:text-zinc-100">
                {newKey.key}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Copy key"
              >
                {copied ? (
                  <Check size={14} className="text-green-500" />
                ) : (
                  <Copy size={14} className="text-zinc-500" />
                )}
              </button>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Set this as <code className="font-mono">x-bot-api-key</code> in your bot process config.
            </p>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="px-6 py-5 space-y-4">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Active keys
        </p>
        {keys.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 py-2">
            <KeyRound size={13} />
            No keys yet. Create one above.
          </div>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 dark:border-zinc-800 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {k.name ?? <span className="italic text-zinc-400">unnamed</span>}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">
                    {k.start ? `${k.start}…` : "—"}
                    <span className="ml-3 font-sans">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                    {k.expiresAt && (
                      <span className="ml-3 font-sans">
                        Expires {new Date(k.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => { handleRevoke(k.id); }}
                  disabled={isPending && revokingId === k.id}
                  className={btnDanger}
                  aria-label={`Revoke ${k.name ?? "key"}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
