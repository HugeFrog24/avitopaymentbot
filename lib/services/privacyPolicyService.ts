import { prisma } from "@/lib/db/prisma"
import type { PrivacyPolicy } from "@/lib/generated/prisma/client"

export type { PrivacyPolicy }

export async function getActivePrivacyPolicy(db = prisma): Promise<PrivacyPolicy | null> {
  return db.privacyPolicy.findFirst({ where: { isActive: true } })
}
