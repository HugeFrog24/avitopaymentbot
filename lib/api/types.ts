/** Shared route param type for dynamic [id] segments in Next.js App Router. */
export interface IdParams { params: Promise<{ id: string }> }
