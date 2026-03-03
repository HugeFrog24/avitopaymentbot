"use server"

import { revalidatePath } from "next/cache"
import { requireScope } from "@/lib/api/auth"
import { updateServiceFee } from "@/lib/services/settingsService"

export async function updateServiceFeeAction(formData: FormData): Promise<string | null> {
  const caller = await requireScope("settings:write")
  if (!caller.ok) return "Unauthorized"

  const raw = (formData.get("serviceFeeRub") as string | null) ?? ""
  const fee = Number(raw)

  if (!Number.isFinite(fee) || fee < 0) {
    return "Fee must be a non-negative number"
  }

  try {
    await updateServiceFee(fee)
    revalidatePath("/admin/settings")
    return null
  } catch (err) {
    return err instanceof Error ? err.message : "Failed to update service fee"
  }
}
