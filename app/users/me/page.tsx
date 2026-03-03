import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export default async function MePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session == null) redirect("/login")
  redirect(`/users/${session.user.id}`)
}
