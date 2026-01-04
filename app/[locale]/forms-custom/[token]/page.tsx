import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guestFormTokens, eventForms, events } from "@/server/db/schemas"
import { isCustomDomainValid } from "@/lib/domain"
import { TokenFormPage } from "@/app/[locale]/forms/t/[token]/client"

export const dynamic = "force-dynamic"

interface FormCustomPageProps {
  params: Promise<{
    token: string
    locale: string
  }>
}

export default async function FormCustomPage({ params }: FormCustomPageProps) {
  const { token, locale } = await params
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    // Not accessed via custom domain - redirect to standard form
    redirect(`/${locale}/forms/t/${token}`)
  }

  // Validate domain is verified by at least one event
  const isDomainValid = await isCustomDomainValid(customDomain)
  if (!isDomainValid) {
    notFound()
  }

  // Look up token
  const tokenRecord = await db.query.guestFormTokens.findFirst({
    where: eq(guestFormTokens.token, token),
    columns: { id: true, expiresAt: true, formId: true },
  })

  if (!tokenRecord) {
    notFound()
  }

  // Check token expiration
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    notFound()
  }

  // Get form with event to verify domain ownership
  const form = await db.query.eventForms.findFirst({
    where: eq(eventForms.id, tokenRecord.formId),
    columns: { id: true, isPublished: true, expiresAt: true },
    with: {
      event: {
        columns: {
          customDomain: true,
          customDomainVerified: true,
        },
      },
    },
  })

  if (!form || !form.isPublished) {
    notFound()
  }

  // Check form expiration
  if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
    notFound()
  }

  // Verify form's event uses this custom domain
  if (
    form.event?.customDomain?.toLowerCase() !== customDomain.toLowerCase() ||
    !form.event?.customDomainVerified
  ) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <TokenFormPage token={token} locale={locale} />
    </div>
  )
}

export async function generateMetadata({ params }: FormCustomPageProps) {
  const { token, locale } = await params
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    return {
      title: "Form",
      robots: "noindex, nofollow",
    }
  }

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
