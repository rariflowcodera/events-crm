import { notFound, redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"
import { VappPage as VappPageComponent } from "@/components/vapp/vapp-page"

interface VappPageProps {
  params: Promise<{
    token: string
    locale: string
  }>
}

export default async function VappPage({ params }: VappPageProps) {
  const { token, locale } = await params

  // Verify token exists
  const guest = await db.query.guests.findFirst({
    where: eq(guests.rsvpToken, token),
    columns: { id: true, serialNumber: true },
  })

  if (!guest) {
    notFound()
  }

  // Check if guest has a serial number (required for VAPP)
  if (!guest.serialNumber) {
    redirect(`/${locale}/vapp/error?reason=no_serial`)
  }

  return (
    <div className="min-h-screen bg-background">
      <VappPageComponent token={token} locale={locale} />
    </div>
  )
}

export async function generateMetadata({ params }: VappPageProps) {
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
    title: `VAPP - ${eventName}`,
    description: "Vehicle Access Parking Permit",
    robots: "noindex, nofollow",
  }
}
