import { prisma } from "@/lib/db/prisma"
import type { TosVersion } from "@/lib/generated/prisma/client"

export type { TosVersion }

export async function getActiveTos(db = prisma): Promise<TosVersion | null> {
  return db.tosVersion.findFirst({ where: { isActive: true } })
}

/**
 * Records that a user agreed to a specific ToS version.
 * Upsert: re-accepting the same version is a no-op.
 */
export async function recordAcceptance(
  userId: string,
  tosVersionId: number,
  db = prisma,
): Promise<void> {
  await db.tosAcceptance.upsert({
    where: { userId_tosVersionId: { userId, tosVersionId } },
    update: {},
    create: { userId, tosVersionId },
  })
}

export async function hasAccepted(
  userId: string,
  tosVersionId: number,
  db = prisma,
): Promise<boolean> {
  const record = await db.tosAcceptance.findUnique({
    where: { userId_tosVersionId: { userId, tosVersionId } },
  })
  return record != null
}
