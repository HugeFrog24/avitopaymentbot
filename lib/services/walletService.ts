import { Decimal } from "@prisma/client/runtime/client"
import type { Wallet, WalletTransaction } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"

// ── Types ────────────────────────────────────────────────────────────────────

export type WalletWithTransactions = Wallet & {
  transactions: WalletTransaction[]
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Returns the user's wallet, creating one (balance = 0) if it doesn't exist.
 * Safe to call standalone or inside an existing transaction.
 */
export async function getOrCreateWallet(userId: string, db = prisma): Promise<Wallet> {
  return db.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
}

/**
 * Credits amountRub to the user's wallet (admin top-up).
 * Creates the wallet automatically if the user doesn't have one yet.
 */
export async function topUp(
  params: { userId: string; amountRub: number | string; note?: string },
  db = prisma,
): Promise<Wallet> {
  const amount = new Decimal(params.amountRub)
  if (amount.lte(0)) throw new Error("Top-up amount must be positive")

  return db.$transaction(async (tx) => {
    // Upsert: create with initial balance, or atomically increment existing
    const wallet = await tx.wallet.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId, balanceRub: amount },
      update: { balanceRub: { increment: amount } },
    })

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "TOPUP",
        amountRub: amount,
        note: params.note ?? null,
      },
    })

    // Re-fetch to guarantee the returned balance reflects the increment
    return tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } })
  })
}

/**
 * Returns the wallet with the 50 most recent transactions.
 * Returns null if the user has never had a wallet (no top-ups yet).
 */
export async function getWalletWithTransactions(
  userId: string,
  db = prisma,
): Promise<WalletWithTransactions | null> {
  return db.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  })
}
