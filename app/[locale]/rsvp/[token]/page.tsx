import { notFound, redirect } from "next/navigation"
import { eq, or } from "drizzle-orm"
import type { Metadata } from "next"
import { db } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"
import { RsvpPage as RsvpPageComponent } from "@/components/rsvp/rsvp-page"

interface RsvpPageProps {
  params: Promise<{
    token: string
    locale: string
  }>
}

export default async function RsvpPage({ params }: RsvpPageProps) {
  const { token, locale } = await params

  // Verify token exists (check both UUID and short code)
  const guest = await db.query.guests.findFirst({
    where: or(eq(guests.rsvpToken, token), eq(guests.rsvpShortCode, token)),
    columns: { id: true, rsvpToken: true },
    with: {
      event: {
        columns: { rsvpDeadline: true },
      },
    },
  })

  if (!guest) {
    notFound()
  }

  // Check event's current RSVP deadline (source of truth, not guest snapshot)
  if (guest.event?.rsvpDeadline && guest.event.rsvpDeadline < new Date()) {
    redirect(`/${locale}/rsvp/expired`)
  }

  // Pass the actual rsvpToken to the component (for API calls)
  return (
    <div className="min-h-screen bg-background">
      <RsvpPageComponent token={guest.rsvpToken} locale={locale} />
    </div>
  )
}

export async function generateMetadata({
  params,
}: RsvpPageProps): Promise<Metadata> {
  const { token, locale } = await params

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

  // Generate OG image URL
  const baseUrl =
    event.customDomain && event.customDomainVerified
      ? `https://${event.customDomain}`
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const ogImageUrl = `${baseUrl}/api/og/rsvp/${token}`

  // Canonical URL
  const canonicalUrl = `${baseUrl}/${locale}/rsvp/${token}`

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
      languages: {
        en: `${baseUrl}/en/rsvp/${token}`,
        ar: `${baseUrl}/ar/rsvp/${token}`,
      },
    },
  }
}
