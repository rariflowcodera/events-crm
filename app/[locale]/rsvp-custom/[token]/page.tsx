import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq, and } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"
import { RsvpPage as RsvpPageComponent } from "@/components/rsvp/rsvp-page"
import { getEventByCustomDomain } from "@/lib/domain"

interface RsvpCustomPageProps {
  params: Promise<{
    token: string
    locale: string
  }>
}

export default async function RsvpCustomPage({ params }: RsvpCustomPageProps) {
  const { token, locale } = await params
  const headersList = await headers()

  // Get custom domain from middleware header
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    // Not accessed via custom domain - redirect to standard RSVP
    redirect(`/${locale}/rsvp/${token}`)
  }

  // Validate domain and get event
  const domainData = await getEventByCustomDomain(customDomain)

  if (!domainData || !domainData.verified) {
    // Domain not found or not verified
    notFound()
  }

  // Verify token exists AND belongs to this specific event
  const guest = await db.query.guests.findFirst({
    where: and(
      eq(guests.rsvpToken, token),
      eq(guests.eventId, domainData.eventId)
    ),
    columns: { id: true, rsvpTokenExpiresAt: true },
  })

  if (!guest) {
    // Token doesn't exist or doesn't belong to this event
    notFound()
  }

  // Check if token is expired
  if (guest.rsvpTokenExpiresAt && guest.rsvpTokenExpiresAt < new Date()) {
    redirect(`/expired?lang=${locale === "ar" ? "ar" : "en"}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <RsvpPageComponent
        token={token}
        locale={locale}
        customDomain={customDomain}
      />
    </div>
  )
}

export async function generateMetadata({ params }: RsvpCustomPageProps) {
  const { token } = await params
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    return {
      title: "RSVP",
      robots: "noindex, nofollow",
    }
  }

  const domainData = await getEventByCustomDomain(customDomain)

  return {
    title: `RSVP - ${domainData?.eventName || "Event"}`,
    description: "Confirm your attendance",
    robots: "noindex, nofollow",
  }
}
