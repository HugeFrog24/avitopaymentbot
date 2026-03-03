import { Decimal } from "@prisma/client/runtime/client"
import { prisma } from "@/lib/db/prisma"

/**
 * Reads (or bootstraps) the singleton Settings row.
 * Safe to call on every request — upsert is a no-op when the row already exists.
 */
export async function getSettings(db = prisma) {
  return db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, serviceFeeRub: new Decimal(500) },
    update: {},
  })
}

/** Updates the global service fee. Only affects orders created after this call. */
export async function updateServiceFee(fee: Decimal | number | string, db = prisma) {
  return db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, serviceFeeRub: new Decimal(fee) },
    update: { serviceFeeRub: new Decimal(fee) },
  })
}
