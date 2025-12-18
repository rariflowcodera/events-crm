import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"
import { RsvpPage as RsvpPageComponent } from "@/components/rsvp/rsvp-page"
import { isCustomDomainValid } from "@/lib/domain"

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

  // Validate domain is verified by at least one event
  const isDomainValid = await isCustomDomainValid(customDomain)

  if (!isDomainValid) {
    // Domain not found or not verified by any event
    notFound()
  }

  // Look up guest by token, include their event to verify domain ownership
  const guest = await db.query.guests.findFirst({
    where: eq(guests.rsvpToken, token),
    columns: { id: true, rsvpTokenExpiresAt: true },
    with: {
      event: {
        columns: {
          customDomain: true,
          customDomainVerified: true,
        },
      },
    },
  })

  if (!guest) {
    // Token doesn't exist
    notFound()
  }

  // Verify guest's event uses this custom domain
  if (
    guest.event?.customDomain?.toLowerCase() !== customDomain.toLowerCase() ||
    !guest.event?.customDomainVerified
  ) {
    // Guest's event doesn't use this domain
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

  // Look up guest by token to get the actual event name
  const guest = await db.query.guests.findFirst({
    where: eq(guests.rsvpToken, token),
    columns: { id: true },
    with: {
      event: {
        columns: { name: true },
      },
    },
  })

  return {
    title: `RSVP - ${guest?.event?.name || "Event"}`,
    description: "Confirm your attendance",
    robots: "noindex, nofollow",
  }
}
