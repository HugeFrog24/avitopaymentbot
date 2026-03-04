"use server"

import { revalidatePath } from "next/cache"
import { requireScope } from "@/lib/api/auth"
import { confirmPayment, transitionStatus, adjustRequired, saveInternalNote } from "@/lib/services/orderService"
import type { OrderStatus, PaymentSource } from "@/lib/generated/prisma/client"

export async function confirmPaymentAction(
  orderId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const caller = await requireScope("orders:payments:write")
  if (!caller.ok) return "Unauthorized"

  const amountRub = (formData.get("amountRub") as string | null) ?? ""
  const noteRaw = (formData.get("note") as string | null) ?? ""
  const source = (formData.get("source") as PaymentSource | null) ?? "DIRECT"
  const iKey = (formData.get("idempotencyKey") as string | null) ?? undefined

  try {
    await confirmPayment({
      orderId,
      amountRub,
      source,
      note: noteRaw.trim() || undefined,
      idempotencyKey: iKey,
      actor: caller.role,
      actorId: caller.userId,
      actorName: caller.actorName,
    })
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath(`/orders/${orderId}`)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : "Payment confirmation failed"
  }
}

export async function transitionStatusAction(
  orderId: string,
  newStatus: OrderStatus,
  message?: string,
): Promise<string | null> {
  const caller = await requireScope("orders:status:write")
  if (!caller.ok) return "Unauthorized"

  try {
    await transitionStatus({
      orderId,
      newStatus,
      actor: caller.role,
      actorId: caller.userId,
      actorName: caller.actorName,
      message: message?.trim() ? message.trim() : undefined,
    })
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath(`/orders/${orderId}`)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : "Status transition failed"
  }
}

export async function adjustRequiredAction(
  orderId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const caller = await requireScope("orders:adjust:write")
  if (!caller.ok) return "Unauthorized"

  const newRequiredRub = (formData.get("newRequiredRub") as string | null) ?? ""
  const reason = ((formData.get("reason") as string | null) ?? "").trim()

  try {
    await adjustRequired({
      orderId,
      newRequiredRub,
      reason,
      actor: caller.role,
      actorId: caller.userId,
      actorName: caller.actorName,
    })
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath(`/orders/${orderId}`)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : "Adjustment failed"
  }
}

export async function saveInternalNoteAction(
  orderId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const caller = await requireScope("orders:notes:write")
  if (!caller.ok) return "Unauthorized"

  const note = ((formData.get("internalNote") as string | null) ?? "").trim() || null

  try {
    await saveInternalNote(orderId, note)
    revalidatePath(`/admin/orders/${orderId}`)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : "Failed to save note"
  }
}
