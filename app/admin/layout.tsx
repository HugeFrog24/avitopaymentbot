import type { ReactNode } from "react"

// Force all admin pages to be dynamically rendered — data changes on every request.
export const dynamic = "force-dynamic"

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>
}
