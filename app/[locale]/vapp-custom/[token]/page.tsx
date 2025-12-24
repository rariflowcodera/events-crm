import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"
import { VappPage as VappPageComponent } from "@/components/vapp/vapp-page"
import { isCustomDomainValid } from "@/lib/domain"

interface VappCustomPageProps {
  params: Promise<{
    token: string
    locale: string
  }>
}

export default async function VappCustomPage({ params }: VappCustomPageProps) {
  const { token, locale } = await params
  const headersList = await headers()

  // Get custom domain from middleware header
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    // Not accessed via custom domain - redirect to standard VAPP
    redirect(`/${locale}/vapp/${token}`)
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
    columns: { id: true, serialNumber: true },
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

  // Check if guest has a serial number (required for VAPP)
  if (!guest.serialNumber) {
    // For custom domains, redirect to error page with query params
    redirect(`/${locale}/vapp-custom/error?reason=no_serial&lang=${locale}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <VappPageComponent token={token} locale={locale} />
    </div>
  )
}

export async function generateMetadata({ params }: VappCustomPageProps) {
  const { token } = await params
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    return {
      title: "VAPP",
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
    title: `VAPP - ${guest?.event?.name || "Event"}`,
    description: "Vehicle Access Parking Permit",
    robots: "noindex, nofollow",
  }
}
