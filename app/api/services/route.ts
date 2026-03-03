import { type NextRequest } from "next/server"
import { searchSuggestions, listSuggestions } from "@/lib/services/suggestionService"
import { ok, serverError } from "@/lib/api/response"

// GET /api/services?q=spo&limit=10
// Returns active service suggestions for autocomplete.
// ?q    — search query (case-insensitive substring match on name); omit or leave empty for top list
// ?limit — max results, capped at 20 (default 10)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") ?? ""
    const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "", 10) || 10, 20)

    const suggestions =
      q.trim().length > 0 ? await searchSuggestions(q, limit) : await listSuggestions(limit)

    return ok(suggestions)
  } catch (err) {
    return serverError(err)
  }
}
