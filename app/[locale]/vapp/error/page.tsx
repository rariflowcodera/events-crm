import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorPageProps {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    reason?: string
  }>
}

export default async function VappErrorPage({ params, searchParams }: ErrorPageProps) {
  const { locale } = await params
  const { reason } = await searchParams

  const isArabic = locale === "ar"

  const getErrorMessage = () => {
    switch (reason) {
      case "no_serial":
        return {
          title: isArabic ? "تصريح الوقوف غير متوفر" : "Parking Permit Not Available",
          description: isArabic
            ? "لم يتم إنشاء رقم تسلسلي لتصريح الوقوف الخاص بك بعد. يرجى التواصل مع منظم الحدث."
            : "A serial number for your parking permit has not been generated yet. Please contact the event organizer.",
        }
      case "not_enabled":
        return {
          title: isArabic ? "تصريح الوقوف غير مفعل" : "Parking Permit Not Enabled",
          description: isArabic
            ? "لم يتم تفعيل تصاريح الوقوف لهذا الحدث."
            : "Parking permits have not been enabled for this event.",
        }
      default:
        return {
          title: isArabic ? "خطأ" : "Error",
          description: isArabic
            ? "حدث خطأ في تحميل تصريح الوقوف. يرجى المحاولة مرة أخرى أو التواصل مع منظم الحدث."
            : "An error occurred while loading your parking permit. Please try again or contact the event organizer.",
        }
    }
  }

  const { title, description } = getErrorMessage()

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>
            {isArabic
              ? "إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع منظم الحدث مباشرة."
              : "If you believe this is an error, please contact the event organizer directly."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export async function generateMetadata({ params, searchParams }: ErrorPageProps) {
  const { locale } = await params
  const isArabic = locale === "ar"

  return {
    title: isArabic ? "خطأ - تصريح الوقوف" : "Error - Parking Permit",
    description: isArabic
      ? "حدث خطأ في تحميل تصريح الوقوف"
      : "An error occurred while loading the parking permit",
    robots: "noindex, nofollow",
  }
}
