import { notFound, redirect } from "next/navigation"
import { eq } from "drizzle-orm"
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

  // Verify token exists and is not expired
  const guest = await db.query.guests.findFirst({
    where: eq(guests.rsvpToken, token),
    columns: { id: true, rsvpTokenExpiresAt: true },
  })

  if (!guest) {
    notFound()
  }

  // Check if token is expired
  if (guest.rsvpTokenExpiresAt && guest.rsvpTokenExpiresAt < new Date()) {
    redirect(`/${locale}/rsvp/expired`)
  }

  return (
    <div className="min-h-screen bg-background">
      <RsvpPageComponent token={token} locale={locale} />
    </div>
  )
}

export async function generateMetadata({ params }: RsvpPageProps) {
  const { token } = await params

  const guest = await db.query.guests.findFirst({
    where: eq(guests.rsvpToken, token),
    with: {
      event: {
        columns: { name: true },
      },
    },
  })

  const eventName = guest?.event?.name || "Event"

  return {
    title: `RSVP - ${eventName}`,
    description: "Confirm your attendance",
    robots: "noindex, nofollow",
  }
}
