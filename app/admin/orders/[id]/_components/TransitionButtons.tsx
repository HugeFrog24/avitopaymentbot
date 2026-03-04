"use client"

import { useState, useTransition, useEffect, useRef } from "react"
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

// Statuses that expand into a note form before firing
const NEEDS_NOTE = new Set<OrderStatus>(["NEEDS_CLARIFICATION", "REJECTED", "REFUNDED"])

const NOTE_PLACEHOLDER: Partial<Record<OrderStatus, string>> = {
  NEEDS_CLARIFICATION: "What info is needed? (optional — leave blank if already discussed verbally)",
  REJECTED: "Reason for rejection (optional)",
  REFUNDED: "Refund reason (optional)",
}

export function TransitionButtons({
  orderId,
  nextStates,
}: Readonly<{ orderId: string; nextStates: OrderStatus[] }>) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [note, setNote] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (pendingStatus != null) textareaRef.current?.focus()
  }, [pendingStatus])

  function handleClick(status: OrderStatus) {
    if (NEEDS_NOTE.has(status)) {
      setPendingStatus(status)
      setNote("")
      setError(null)
      return
    }
    fire(status, undefined)
  }

  function handleConfirm() {
    if (pendingStatus == null) return
    fire(pendingStatus, note.trim() || undefined)
  }

  function handleCancel() {
    setPendingStatus(null)
    setNote("")
    setError(null)
  }

  function fire(status: OrderStatus, message: string | undefined) {
    setError(null)
    startTransition(async () => {
      const err = await transitionStatusAction(orderId, status, message)
      if (err == null) {
        setPendingStatus(null)
        setNote("")
      } else {
        setError(err)
      }
    })
  }

  if (nextStates.length === 0) {
    return <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No further transitions available.</p>
  }

  return (
    <div className="space-y-2">
      {nextStates.map((status) => {
        const destructive = DESTRUCTIVE.has(status)
        const isExpanded = pendingStatus === status
        const btnCls = destructive
          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        const panelCls = destructive
          ? "border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10"
          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40"
        const confirmCls = destructive
          ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"

        return (
          <div key={status}>
            <button
              type="button"
              disabled={isPending || (pendingStatus != null && !isExpanded)}
              onClick={() => { handleClick(status) }}
              className={
                `w-full text-left px-3 py-2 text-xs font-medium border rounded-lg transition-colors ` +
                `disabled:opacity-50 disabled:cursor-not-allowed ${btnCls}` +
                (isExpanded ? " rounded-b-none border-b-transparent" : "")
              }
            >
              {isPending && isExpanded ? "…" : LABELS[status]}
            </button>

            {isExpanded && (
              <div className={`border border-t-0 rounded-b-lg p-3 space-y-2 ${panelCls}`}>
                <textarea
                  ref={textareaRef}
                  value={note}
                  onChange={(e) => { setNote(e.target.value) }}
                  placeholder={NOTE_PLACEHOLDER[status] ?? "Note (optional)"}
                  rows={2}
                  className={
                    "w-full text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-2 " +
                    "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 " +
                    "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
                    "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 resize-none"
                  }
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleConfirm}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors disabled:opacity-50 ${confirmCls}`}
                  >
                    {isPending ? "…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleCancel}
                    className="flex-1 text-xs font-medium py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {error != null && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  )
}
