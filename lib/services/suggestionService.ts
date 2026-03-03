import type { ServiceSuggestion } from "@/lib/generated/prisma/client"
export type { ServiceSuggestion } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"

/**
 * Fuzzy autocomplete search over service names using pg_trgm.
 * Combines substring match (ILIKE) with trigram similarity for typo tolerance.
 * Results are ranked by similarity score, then by sortOrder.
 */
export async function searchSuggestions(
  query: string,
  limit = 10,
  db = prisma,
): Promise<ServiceSuggestion[]> {
  const q = query.trim()
  const pattern = `%${q}%`
  return db.$queryRaw<ServiceSuggestion[]>`
    SELECT id, name, category, "defaultCurrency", "defaultTariff", "sortOrder", "isActive", "createdAt"
    FROM   "ServiceSuggestion"
    WHERE  "isActive" = true
      AND  (
        name ILIKE ${pattern}
        OR word_similarity(${q}, name) > 0.3
      )
    ORDER BY word_similarity(${q}, name) DESC, "sortOrder" ASC, name ASC
    LIMIT ${limit}::int
  `
}

/**
 * Returns active suggestions in sortOrder for a browse/default list.
 * Pass limit to cap the result set (e.g. for typeahead default view).
 */
export async function listSuggestions(limit?: number, db = prisma): Promise<ServiceSuggestion[]> {
  return db.serviceSuggestion.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    ...(limit == null ? {} : { take: limit }),
  })
}
