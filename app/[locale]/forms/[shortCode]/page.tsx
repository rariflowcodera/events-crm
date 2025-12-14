import { notFound } from "next/navigation"
import { db } from "@/server/db/config/database"
import { eventForms, events } from "@/server/db/schemas"
import { eq } from "drizzle-orm"
import { PublicFormPage } from "./client"

export const dynamic = "force-dynamic"

interface PublicFormPageProps {
  params: Promise<{
    shortCode: string
    locale: string
  }>
}

export default async function FormPage({ params }: PublicFormPageProps) {
  const { shortCode, locale } = await params

  // Verify form exists and is published
  const form = await db.query.eventForms.findFirst({
    where: eq(eventForms.shortCode, shortCode),
    columns: { id: true, isPublished: true, expiresAt: true, eventId: true, name: true },
  })

  if (!form || !form.isPublished) {
    notFound()
  }

  // Check if form has expired
  if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicFormPage shortCode={shortCode} locale={locale} />
    </div>
  )
}

export async function generateMetadata({ params }: PublicFormPageProps) {
  const { shortCode } = await params

  const form = await db.query.eventForms.findFirst({
    where: eq(eventForms.shortCode, shortCode),
    columns: { name: true, eventId: true },
  })

  if (!form) {
    return { title: "Form Not Found" }
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, form.eventId),
    columns: { name: true },
  })

  const eventName = event?.name || "Event"

  return {
    title: `${form.name} - ${eventName}`,
    description: "Complete this form",
    robots: "noindex, nofollow",
  }
}
