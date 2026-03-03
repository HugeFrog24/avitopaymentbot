"use client"

import { useState, useTransition } from "react"
import type { OrderStatus } from "@/lib/generated/prisma/client"
import { transitionStatusAction } from "../actions"

const LABELS: Record<OrderStatus, string> = {
  DRAFT: "Reset to Draft",
  NEEDS_CLARIFICATION: "Request Clarification",
  CONTEXT_COMPLETE: "Mark Ready",
  WAITING_ADMIN_APPROVAL: "Submit for Approval",
  WAITING_PAYMENT: "Approve → Awaiting Payment",
  REJECTED: "Reject Order",
  PARTIALLY_PAID: "Mark Partially Paid",
  FULLY_PAID: "Mark Fully Paid",
  DELIVERED: "Mark as Delivered",
  CLOSED: "Close Order",
  REFUNDED: "Issue Refund",
}

const DESTRUCTIVE = new Set<OrderStatus>(["REJECTED", "REFUNDED", "CLOSED"])

export function TransitionButtons({
  orderId,
  nextStates,
}: Readonly<{ orderId: string; nextStates: OrderStatus[] }>) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick(newStatus: OrderStatus) {
    setError(null)
    startTransition(async () => {
      const err = await transitionStatusAction(orderId, newStatus)
      if (err != null) setError(err)
    })
  }

  if (nextStates.length === 0) {
    return <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No further transitions available.</p>
  }

  return (
    <div className="space-y-2">
      {nextStates.map((status) => {
        const destructive = DESTRUCTIVE.has(status)
        const cls = destructive
          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        return (
          <button
            key={status}
            type="button"
            disabled={isPending}
            onClick={() => { handleClick(status); }}
            className={`w-full text-left px-3 py-2 text-xs font-medium border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
          >
            {isPending ? "…" : LABELS[status]}
          </button>
        )
      })}
      {error != null && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  )
}
