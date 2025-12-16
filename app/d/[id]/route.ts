import { NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db/config/database"
import { eventDocuments, events } from "@/server/db/schemas"
import { eq } from "drizzle-orm"

/**
 * Document proxy route for branded URLs
 *
 * When accessed via custom domain (e.g., https://event.example.com/d/{id}),
 * validates that the document belongs to the event associated with that domain,
 * then redirects to the actual S3 URL.
 *
 * When accessed via main app domain, allows access to any document.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const customDomain = request.headers.get("x-custom-domain")

  // Look up document with event details
  const document = await db.query.eventDocuments.findFirst({
    where: eq(eventDocuments.id, id),
    with: {
      event: {
        columns: {
          id: true,
          customDomain: true,
          customDomainVerified: true,
        },
      },
    },
  })

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  // If accessed via custom domain, verify it matches this document's event
  if (customDomain) {
    const normalizedCustomDomain = customDomain.toLowerCase().trim()
    const eventDomain = document.event.customDomain?.toLowerCase().trim()

    // Check if the custom domain matches the event's verified custom domain
    if (
      !document.event.customDomainVerified ||
      !eventDomain ||
      normalizedCustomDomain !== eventDomain
    ) {
      // Document doesn't belong to this custom domain's event
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }
  }

  // Redirect to actual S3/storage URL (fast, no bandwidth through server)
  return NextResponse.redirect(document.url, 302)
}
