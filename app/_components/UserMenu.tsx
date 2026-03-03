"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { UserAvatar } from "@/app/_components/UserAvatar"

interface Props {
  userId: string
  displayName: string
}

const itemCls =
  "block w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 " +
  "hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"

export function UserMenu({ userId, displayName }: Readonly<Props>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => { document.removeEventListener("mousedown", onMouseDown) }
  }, [])

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => { router.push("/login") },
      },
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v) }}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <span className="shrink-0 rounded-full overflow-hidden">
          <UserAvatar userId={userId} size={24} />
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg py-1 z-20">
          <Link
            href={`/users/${userId}`}
            onClick={() => { setOpen(false) }}
            className={itemCls}
          >
            My profile
          </Link>
          <Link
            href="/orders/my"
            onClick={() => { setOpen(false) }}
            className={itemCls}
          >
            My orders
          </Link>
          <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
          <button
            type="button"
            onClick={() => { void handleSignOut() }}
            className="block w-full text-left px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
