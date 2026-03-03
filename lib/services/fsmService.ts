import type { OrderStatus } from "@/lib/generated/prisma/client"

/**
 * Allowed FSM transitions.
 * Key   = current status
 * Value = set of statuses this state can move TO
 *
 * Terminal states (REJECTED, CLOSED, REFUNDED) have empty arrays —
 * no further transitions are possible.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["NEEDS_CLARIFICATION", "CONTEXT_COMPLETE", "CLOSED"],
  NEEDS_CLARIFICATION: ["CONTEXT_COMPLETE", "CLOSED"],
  CONTEXT_COMPLETE: ["WAITING_ADMIN_APPROVAL", "NEEDS_CLARIFICATION", "CLOSED"],
  WAITING_ADMIN_APPROVAL: ["WAITING_PAYMENT", "REJECTED", "NEEDS_CLARIFICATION"],
  REJECTED: [],
  // PARTIALLY_PAID and FULLY_PAID are auto-only: set by confirmPayment/adjustRequired
  // via derivePaymentStatus. Allowing them here as manual transitions creates orphaned
  // statuses with no PaymentEntry backing them up (paidRub stays unchanged).
  WAITING_PAYMENT: ["REFUNDED"],
  PARTIALLY_PAID: ["REFUNDED"],
  FULLY_PAID: ["DELIVERED"],
  DELIVERED: ["CLOSED", "REFUNDED"],
  CLOSED: ["REFUNDED"],
  REFUNDED: [],
}

/** Returns true if the transition from → to is valid. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** Returns all valid next states from the given status. */
export function getNextStates(from: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[from]
}

/** Throws if the transition is not allowed. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid status transition: ${from} → ${to}. Allowed: [${getNextStates(from).join(", ")}]`,
    )
  }
}

/** All valid order statuses (derived from the transition map to avoid duplication). */
export const ALL_STATUSES = Object.keys(ALLOWED_TRANSITIONS) as OrderStatus[]

/** Terminal states — no further transitions possible. */
export const TERMINAL_STATES: OrderStatus[] = ["REJECTED", "REFUNDED"]

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATES.includes(status)
}
