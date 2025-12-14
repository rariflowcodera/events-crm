import { redirect, notFound } from "next/navigation"
import { db } from "@/server/db/config/database"
import { eventForms, events, workspaces } from "@/server/db/schemas"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

type ShortCodePageProps = {
  params: Promise<{
    shortCode: string
  }>
}

export default async function ShortCodeRedirectPage({ params }: ShortCodePageProps) {
  const { shortCode } = await params

  // Find the form by short code
  const form = await db.query.eventForms.findFirst({
    where: eq(eventForms.shortCode, shortCode),
  })

  if (!form) {
    notFound()
  }

  // Check if form is published
  if (!form.isPublished) {
    notFound()
  }

  // Check if form has expired
  if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
    notFound()
  }

  // Get the event and workspace for the redirect URL
  const event = await db.query.events.findFirst({
    where: eq(events.id, form.eventId),
  })

  if (!event) {
    notFound()
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, form.workspaceId),
  })

  if (!workspace) {
    notFound()
  }

  // Redirect to the public form page
  redirect(`/en/forms/${shortCode}`)
}
