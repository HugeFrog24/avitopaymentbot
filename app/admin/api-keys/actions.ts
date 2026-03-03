"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { requireAdminPage } from "@/lib/api/auth"
import { auth } from "@/lib/auth"

export async function createApiKeyAction(
  name: string,
  expiresIn?: number, // seconds; omit for a perpetual key
): Promise<{ id: string; key: string; name: string | null } | string> {
  const adminId = await requireAdminPage()

  if (!name.trim()) return "Name is required"

  try {
    const result = await auth.api.createApiKey({
      body: {
        name: name.trim(),
        userId: adminId,
        ...(expiresIn === undefined ? {} : { expiresIn }),
      },
    })
    revalidatePath("/admin/api-keys")
    return { id: result.id, key: result.key, name: result.name ?? null }
  } catch (err) {
    return err instanceof Error ? err.message : "Failed to create API key"
  }
}

export async function revokeApiKeyAction(keyId: string): Promise<string | null> {
  await requireAdminPage()

  try {
    await auth.api.deleteApiKey({
      body: { keyId },
      headers: await headers(),
    })
    revalidatePath("/admin/api-keys")
    return null
  } catch (err) {
    return err instanceof Error ? err.message : "Failed to revoke API key"
  }
}
