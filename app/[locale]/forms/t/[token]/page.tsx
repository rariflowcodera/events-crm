import { notFound } from "next/navigation"
import { db } from "@/server/db/config/database"
import { guestFormTokens, eventForms, events } from "@/server/db/schemas"
import { eq } from "drizzle-orm"
import { TokenFormPage } from "./client"

export const dynamic = "force-dynamic"

interface TokenFormPageProps {
  params: Promise<{
    token: string
    locale: string
  }>
}

export default async function FormPage({ params }: TokenFormPageProps) {
  const { token, locale } = await params

  // Verify token exists
  const tokenRecord = await db.query.guestFormTokens.findFirst({
    where: eq(guestFormTokens.token, token),
    columns: { id: true, expiresAt: true, formId: true },
  })

  if (!tokenRecord) {
    notFound()
  }

  // Check if token has expired
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    notFound()
  }

  // Get the form and verify it's published
  const form = await db.query.eventForms.findFirst({
    where: eq(eventForms.id, tokenRecord.formId),
    columns: { id: true, isPublished: true, expiresAt: true },
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
      <TokenFormPage token={token} locale={locale} />
    </div>
  )
}

export async function generateMetadata({ params }: TokenFormPageProps) {
  const { token, locale } = await params

  const tokenRecord = await db.query.guestFormTokens.findFirst({
    where: eq(guestFormTokens.token, token),
    columns: { formId: true },
  })

  if (!tokenRecord) {
    return { title: "Form Not Found" }
  }

  const form = await db.query.eventForms.findFirst({
    where: eq(eventForms.id, tokenRecord.formId),
    columns: { name: true, eventId: true },
  })

  if (!form) {
    return { title: "Form Not Found" }
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, form.eventId),
    columns: { name: true, nameAr: true },
  })

  // Extract localized names
  const formName = form.name as { en?: string; ar?: string } | null
  const formTitle = locale === "ar" && formName?.ar ? formName.ar : formName?.en || "Form"
  const eventName = locale === "ar" && event?.nameAr ? event.nameAr : event?.name || "Event"

  return {
    title: `${formTitle} - ${eventName}`,
    description: "Complete this form",
    robots: "noindex, nofollow",
  }
}
