# AvitoPaymentGigBot — Project Instructions

## Standing Rule

Always fetch current official docs before using or integrating any dependency.
Never rely on training data alone — it goes stale. Use WebFetch on official doc URLs first.

## Package manager

**pnpm only.** Never npm or yarn.

## Language

**TypeScript strict mode** throughout. No plain JS files in src.

## Stack

- Next.js 16.1.6 — App Router, route handlers as headless API
- Prisma + PostgreSQL (Docker)
- Tailwind CSS v4
- Telegram bot: separate process (language TBD), communicates via HTTP API

## Critical Next.js v16 Note

`middleware.ts` is now `proxy.ts`. Exported function is `proxy`, not `middleware`.
Docs: https://nextjs.org/docs/app/getting-started/proxy

## Architecture

- API is the single source of truth. All business logic lives in `lib/services/`.
- Route handlers are thin: validate input → call service → return response.
- Bot is a separate HTTP client (webhook-based). Authenticates with `BOT_API_KEY` header.
- Payment model is balance-based: `balance = requiredRub - paidRub`. Card delivered only when `balance == 0`.
- Card details (PAN, CVC) are NOT stored in DB. Fetched/generated dynamically at delivery.
- Currency rate is frozen at offer creation time (`rateUsed`, `rateTimestamp` on Order).

## Project structure

```
app/
  admin/                      Dashboard UI (reads from DB via listOrders())
    _components/OrdersTable.tsx
    _components/StatusBadge.tsx
    page.tsx
  api/
    orders/
      route.ts              POST (create), GET (list)
      [id]/
        route.ts            GET, PATCH
        status/route.ts     POST (FSM transition)
        payments/route.ts   POST (confirm payment — supports idempotencyKey, source)
        adjust/route.ts     POST (adjust requiredRub — auto-credits wallet on price reduction)
        rate/route.ts       POST (freeze exchange rate)
    users/
      [id]/
        wallet/
          route.ts          GET (balance + last 50 transactions)
          topup/route.ts    POST (admin credits funds)
    auth/
      route.ts
lib/
  services/
    orderService.ts
    walletService.ts
    fsmService.ts
    currencyService.ts
  db/
    prisma.ts
prisma/
  schema.prisma
proxy.ts                    Auth guard for admin/bot routes
```

## FSM order states

```
DRAFT → NEEDS_CLARIFICATION → CONTEXT_COMPLETE → WAITING_ADMIN_APPROVAL
→ REJECTED                                (terminal)
→ WAITING_PAYMENT → PARTIALLY_PAID ┐
                  → FULLY_PAID     ┘ → DELIVERED → CLOSED ┐
                  → REFUNDED                      → REFUNDED
                                     DELIVERED   → REFUNDED
                                                   (terminal)
```

Simplified: every state from WAITING_PAYMENT onward can reach REFUNDED.
DELIVERED and CLOSED can both transition to REFUNDED for post-delivery disputes.
Only REJECTED and REFUNDED are terminal (no further transitions).

## RBAC roles

- `ADMIN` — full access, all status transitions
- `CLIENT` — create order, view own orders, cancel before approval
- `BOT` — service account, allowed actions only (create, update draft, read status)

## Financial model — important design decisions

### Hybrid wallet model

- Per-order: `requiredRub` / `paidRub` on Order. `paidRub` is a write-through running total
  maintained by `confirmPayment`. Delivery gated on `paidRub >= requiredRub`.
- Per-client: `Wallet.balanceRub` — a named credit pool. `WalletTransaction` is the
  immutable audit trail. Balance = running total (fast reads, no aggregation).
- `confirmPayment` accepts `source: DIRECT | WALLET`. WALLET path does an atomic
  check-and-decrement (`updateMany` with balance guard) to prevent race conditions.

### Overpayment

- If `paidRub > requiredRub` after confirmation, excess is auto-credited to the client's
  wallet as a `REFUND` WalletTransaction. Wallet is upserted (created if first interaction).
- Client always gets the credit. There is no "cash refund" path — by design for this
  business model. If a real cash refund is needed, admin manually records it externally
  and issues a `WalletTransaction { type: ADJUSTMENT }` to zero the wallet balance.

### Partial refunds (price reduction after payment)

- `adjustRequired` auto-detects `paidRub > newRequired` and credits the difference to
  the client's wallet as a `REFUND` WalletTransaction inside the same $transaction.
- No separate refund endpoint needed. Call `adjustRequired` with the corrected price;
  the wallet credit is automatic.

### Retroactive payments (post-delivery reconciliation)

- `confirmPayment` accepts DELIVERED orders (not just WAITING_PAYMENT/PARTIALLY_PAID).
- `adjustRequired` accepts DELIVERED orders too.
- CLOSED is the financial terminal state. Once CLOSED, no more adjustments or payments.
  Disputes on CLOSED orders go to REFUNDED via FSM transition.

### Idempotency

- `PaymentEntry` has an optional `idempotencyKey String? @unique`.
- Caller (admin UI) should send a UUID per button-press.
- `confirmPayment` checks for an existing entry with that key before proceeding.
  Second call with same key is a no-op — returns current order state.
- Without a key: double-confirm creates two PaymentEntries; overpayment auto-credits
  wallet (recoverable), but admin must manually issue a negative ADJUSTMENT.

### paidRub consistency invariant

- `paidRub` should always equal `SUM(PaymentEntry.amountRub)` for the order.
- This is maintained by the service layer only — there is no DB constraint enforcing it.
- If a PaymentEntry is ever modified outside the service layer (raw SQL, migrations),
  `paidRub` will silently drift. A periodic reconciliation query is advisable in production.

## Known intentional gaps (do not accidentally "fix" these)

### No pending-payment state

Clients cannot self-report payments for admin review. Sergey is the sole authority on
confirmed payments. Adding a PENDING_PAYMENT_REVIEW FSM state would require bot UI
changes and is deferred until the bot is built.

### No client consent gate for price adjustments

`adjustRequired` can be called by admin without client approval. The Adjustment table
and OrderEvent log provide a full audit trail. For this business (small-scale, trust-based),
a formal consent gate is out of scope.

### REFUNDED carries no financial payload

The REFUNDED status is a flag only — no `refundAmountRub`, `refundMethod`, or timestamp
beyond `updatedAt`. For a dispute log, the OrderEvent message is the record.
A proper `RefundEntry` model is a future concern if regulatory compliance is needed.

### adjustRequired blocked on CLOSED

Once an order is CLOSED, price adjustments are not allowed. The only path is REFUNDED.
This is intentional: CLOSED means Sergey has considered the order fully settled.

### Wallet history pagination

`getWalletWithTransactions` returns the last 50 transactions. For long-running clients
with heavy wallet use, older history is not surfaced via the API. Paginate when needed.

### No Web→Bot notification channel

When Sergey acts on the dashboard (approves, confirms payment, etc.), the bot has no
notification mechanism. Plan: PostgreSQL LISTEN/NOTIFY or an internal webhook endpoint
on the bot. This is the most critical missing piece for a real deployment.
