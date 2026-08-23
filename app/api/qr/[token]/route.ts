import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { eq, or } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"

export const dynamic = "force-dynamic"

/**
 * Server-rendered PNG QR code for a guest's reference number.
 * Looked up by the guest's RSVP token/short code (existing public-access
 * pattern) — the QR payload itself is the reference number, not this token.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const guest = await db.query.guests.findFirst({
    where: or(eq(guests.rsvpToken, token), eq(guests.rsvpShortCode, token)),
    columns: { referenceNumber: true },
  })

  if (!guest || !guest.referenceNumber) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const png = await QRCode.toBuffer(guest.referenceNumber, {
    type: "png",
    width: 400,
    margin: 1,
  })

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=86400",
    },
  })
}
