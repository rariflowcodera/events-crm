import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { eq, or } from "drizzle-orm"
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

  // Look up guest by token (UUID or short code), include their event to verify domain ownership
  const guest = await db.query.guests.findFirst({
    where: or(eq(guests.rsvpToken, token), eq(guests.rsvpShortCode, token)),
    columns: { id: true, rsvpTokenExpiresAt: true, rsvpToken: true },
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

  // Pass the actual rsvpToken to the component (for API calls)
  return (
    <div className="min-h-screen bg-background">
      <RsvpPageComponent
        token={guest.rsvpToken}
        locale={locale}
        customDomain={customDomain}
      />
    </div>
  )
}

export async function generateMetadata({
  params,
}: RsvpCustomPageProps): Promise<Metadata> {
  const { token, locale } = await params
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    return {
      title: "RSVP",
      robots: "noindex, nofollow",
    }
  }

  // Look up guest by either UUID or short code
  const guest = await db.query.guests.findFirst({
    where: or(eq(guests.rsvpToken, token), eq(guests.rsvpShortCode, token)),
    with: {
      event: {
        columns: {
          id: true,
          name: true,
          nameAr: true,
          description: true,
          venue: true,
          venueAddress: true,
          startDate: true,
          endDate: true,
          startTime: true,
          endTime: true,
          customDomain: true,
          customDomainVerified: true,
          branding: true,
        },
      },
    },
  })

  if (!guest?.event) {
    return {
      title: "RSVP",
      robots: "noindex, nofollow",
    }
  }

  const event = guest.event
  const isArabic = locale === "ar"

  // Bilingual event name
  const eventName = isArabic && event.nameAr ? event.nameAr : event.name

  // Format date for description - use UTC to avoid timezone shifts
  const formatEventDate = () => {
    if (!event.startDate) return ""
    const date = new Date(event.startDate)
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC", // Use UTC to display the stored date consistently
    }
    return date.toLocaleDateString(isArabic ? "ar-SA" : "en-US", options)
  }

  // Build description with date and venue
  const descriptionParts: string[] = []
  if (event.startDate) {
    descriptionParts.push(formatEventDate())
  }
  if (event.startTime) {
    descriptionParts.push(event.startTime)
  }
  if (event.venue) {
    descriptionParts.push(event.venue)
  }

  const description =
    descriptionParts.length > 0
      ? descriptionParts.join(" | ")
      : isArabic
        ? "تأكيد حضورك"
        : "Confirm your attendance"

  // Use custom domain for OG image URL
  const baseUrl = `https://${customDomain}`
  const ogImageUrl = `${baseUrl}/api/og/rsvp/${token}`

  // Canonical URL
  const canonicalUrl = `${baseUrl}/rsvp/${token}`

  return {
    title: isArabic ? `تأكيد الحضور - ${eventName}` : `RSVP - ${eventName}`,
    description,
    robots: "noindex, nofollow",
    openGraph: {
      title: eventName,
      description,
      type: "website",
      url: canonicalUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: eventName,
        },
      ],
      locale: isArabic ? "ar_SA" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: eventName,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  }
}
