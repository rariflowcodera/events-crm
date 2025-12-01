import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ExpiredPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function ExpiredPage({ params }: ExpiredPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "rsvp" })

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
              ? "انتهت صلاحية رابط الرد على الدعوة. يرجى التواصل مع منظم الحدث للمساعدة."
              : "This RSVP link has expired. Please contact the event organizer for assistance."}
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

export async function generateMetadata({ params }: ExpiredPageProps) {
  const { locale } = await params

  return {
    title: locale === "ar" ? "انتهت صلاحية الرابط" : "Link Expired",
    description:
      locale === "ar" ? "انتهت صلاحية رابط الرد على الدعوة" : "RSVP link has expired",
    robots: "noindex, nofollow",
  }
}
