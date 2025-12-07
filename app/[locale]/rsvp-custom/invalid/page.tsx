import { headers } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface InvalidDomainPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function InvalidDomainPage({ params }: InvalidDomainPageProps) {
  const { locale } = await params
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">
            {locale === "ar" ? "النطاق غير صالح" : "Invalid Domain"}
          </CardTitle>
          <CardDescription>
            {locale === "ar"
              ? "هذا النطاق غير مرتبط بأي حدث أو لم يتم التحقق منه بعد."
              : "This domain is not associated with any event or has not been verified yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
          {customDomain && (
            <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
              {customDomain}
            </p>
          )}
          <p>
            {locale === "ar"
              ? "إذا كنت تتوقع الوصول إلى صفحة RSVP، يرجى التحقق من الرابط أو التواصل مع منظم الحدث."
              : "If you expected to reach an RSVP page, please check the link or contact the event organizer."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export async function generateMetadata({ params }: InvalidDomainPageProps) {
  const { locale } = await params

  return {
    title: locale === "ar" ? "النطاق غير صالح" : "Invalid Domain",
    description:
      locale === "ar"
        ? "هذا النطاق غير مرتبط بأي حدث"
        : "This domain is not associated with any event",
    robots: "noindex, nofollow",
  }
}
