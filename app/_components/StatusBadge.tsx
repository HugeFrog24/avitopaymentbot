import type { OrderStatus } from "@/lib/generated/prisma/client"

const STATUS_CONFIG: Record<OrderStatus, { label: string; classes: string }> = {
  DRAFT: { label: "Draft", classes: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
  NEEDS_CLARIFICATION: { label: "Needs Info", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  CONTEXT_COMPLETE: { label: "Ready", classes: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  WAITING_ADMIN_APPROVAL: { label: "Pending", classes: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  REJECTED: { label: "Rejected", classes: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  WAITING_PAYMENT: { label: "Awaiting Payment", classes: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  PARTIALLY_PAID: { label: "Partial", classes: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  FULLY_PAID: { label: "Fully Paid", classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  DELIVERED: { label: "Delivered", classes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  CLOSED: { label: "Closed", classes: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
  REFUNDED: { label: "Refunded", classes: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
}

export function StatusBadge({ status }: Readonly<{ status: OrderStatus }>) {
  const { label, classes } = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  )
}
