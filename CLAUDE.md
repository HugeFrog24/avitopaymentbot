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
  api/
    orders/
      route.ts              POST (create), GET (list)
      [id]/
        route.ts            GET, PATCH
        status/route.ts     POST (FSM transition)
        payments/route.ts   POST (confirm payment entry)
        adjust/route.ts     POST (adjust requiredRub)
    auth/
      route.ts
lib/
  services/
    orderService.ts
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
→ REJECTED
→ WAITING_PAYMENT → PARTIALLY_PAID | FULLY_PAID → DELIVERED → CLOSED → REFUNDED
```

## RBAC roles
- `ADMIN` — full access, all status transitions
- `CLIENT` — create order, view own orders, cancel before approval
- `BOT` — service account, allowed actions only (create, update draft, read status)
