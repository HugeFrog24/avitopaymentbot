import { NextResponse } from "next/server"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client"

/** Returns true when a Prisma query threw because the record was not found (P2025). */
export function isPrismaNotFound(err: unknown): boolean {
  return err instanceof PrismaClientKnownRequestError && err.code === "P2025"
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 })
}

export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : "Internal server error"
  console.error("[API Error]", err)
  return NextResponse.json({ error: message }, { status: 500 })
}
