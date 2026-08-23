/**
 * Guest Reference Number Generator
 *
 * Generates PNR-style reference numbers (e.g. "GALA-7K3F9Q") for guests once
 * they confirm attendance. Reference numbers are unique per event and are
 * encoded into the guest's QR code (see app/api/qr/[token]/route.ts).
 */

import { and, eq, isNull } from "drizzle-orm"
import type { db as Database } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"

// No 0/O/1/I to avoid ambiguity when read or typed manually
const REFERENCE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
const CODE_LENGTH = 6
const MAX_ATTEMPTS = 5

function randomReferenceCode(length = CODE_LENGTH): string {
  let code = ""
  for (let i = 0; i < length; i++) {
    code += REFERENCE_CHARSET.charAt(Math.floor(Math.random() * REFERENCE_CHARSET.length))
  }
  return code
}

export function buildReferencePrefix(event: {
  name: string
  settings?: { referencePrefix?: string } | null
}): string {
  if (event.settings?.referencePrefix) {
    return event.settings.referencePrefix.toUpperCase()
  }
  const fromName = event.name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase()
  return fromName || "EVT"
}

/**
 * Generates and persists a unique referenceNumber for a guest, retrying on
 * collision (same approach as generateUniqueRsvpShortCode).
 * Returns the existing referenceNumber if the guest already has one.
 */
export async function ensureGuestReferenceNumber(
  db: typeof Database,
  guest: { id: string; eventId: string; referenceNumber: string | null },
  event: { name: string; settings?: { referencePrefix?: string } | null }
): Promise<string> {
  if (guest.referenceNumber) return guest.referenceNumber

  const prefix = buildReferencePrefix(event)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = `${prefix}-${randomReferenceCode()}`

    const existing = await db.query.guests.findFirst({
      where: and(eq(guests.eventId, guest.eventId), eq(guests.referenceNumber, candidate)),
      columns: { id: true },
    })

    if (existing) continue

    const [updated] = await db
      .update(guests)
      .set({ referenceNumber: candidate })
      .where(and(eq(guests.id, guest.id), isNull(guests.referenceNumber)))
      .returning({ referenceNumber: guests.referenceNumber })

    if (updated?.referenceNumber) return updated.referenceNumber

    // Someone else set it concurrently; re-read and return.
    const refreshed = await db.query.guests.findFirst({
      where: eq(guests.id, guest.id),
      columns: { referenceNumber: true },
    })
    if (refreshed?.referenceNumber) return refreshed.referenceNumber
  }

  // Fallback: longer code if collisions persist (extremely rare)
  const fallback = `${prefix}-${randomReferenceCode(9)}`
  await db
    .update(guests)
    .set({ referenceNumber: fallback })
    .where(and(eq(guests.id, guest.id), isNull(guests.referenceNumber)))
  return fallback
}
