import { headers } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getEventByCustomDomain } from "@/lib/domain"

interface ExpiredPageProps {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    event?: string
    lang?: string
  }>
}

export default async function ExpiredPage({ params, searchParams }: ExpiredPageProps) {
  const { locale } = await params
  const { event: eventParam } = await searchParams

  // Prefer event name from URL param (accurate for the specific guest)
  let eventName = "Event"
  if (eventParam) {
    eventName = eventParam
  } else {
    // Fallback to domain lookup (for legacy/direct access)
    const headersList = await headers()
    const customDomain = headersList.get("x-custom-domain")
    if (customDomain) {
      const domainData = await getEventByCustomDomain(customDomain)
      if (domainData) {
        eventName = domainData.eventName
      }
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {locale === "ar" ? "انتهت صلاحية الرابط" : "Link Expired"}
          </CardTitle>
          <CardDescription>
            {locale === "ar"
              ? `انتهت صلاحية رابط الرد على الدعوة لـ ${eventName}. يرجى التواصل مع منظم الحدث للمساعدة.`
              : `This RSVP link for ${eventName} has expired. Please contact the event organizer for assistance.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>
            {locale === "ar"
              ? "إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع منظم الحدث مباشرة."
              : "If you believe this is an error, please contact the event organizer directly."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export async function generateMetadata({ params, searchParams }: ExpiredPageProps) {
  const { locale } = await params
  const { event: eventParam } = await searchParams

  // Prefer event name from URL param (accurate for the specific guest)
  let eventName = "Event"
  if (eventParam) {
    eventName = eventParam
  } else {
    // Fallback to domain lookup (for legacy/direct access)
    const headersList = await headers()
    const customDomain = headersList.get("x-custom-domain")
    if (customDomain) {
      const domainData = await getEventByCustomDomain(customDomain)
      if (domainData) {
        eventName = domainData.eventName
      }
    }
  }

  return {
    title:
      locale === "ar"
        ? `انتهت صلاحية الرابط - ${eventName}`
        : `Link Expired - ${eventName}`,
    description:
      locale === "ar"
        ? "انتهت صلاحية رابط الرد على الدعوة"
        : "RSVP link has expired",
    robots: "noindex, nofollow",
  }
}
