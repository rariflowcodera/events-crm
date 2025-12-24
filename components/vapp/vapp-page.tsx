"use client"

import { useSearchParams } from "next/navigation"

import { trpc } from "@/trpc/client"
import { VappVoucher } from "@/components/vapp/vapp-voucher"
import { VappDownloadButton } from "@/components/vapp/vapp-download-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface VappPageProps {
  token: string
  locale: string
}

export function VappPage({ token, locale }: VappPageProps) {
  const searchParams = useSearchParams()
  const isPrintMode = searchParams.get("print") === "true"

  const { data, isLoading, error } = trpc.publicVapp.getByToken.useQuery({ token })

  const isArabic = locale === "ar"

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isArabic ? "خطأ" : "Error"}
            </CardTitle>
            <CardDescription>
              {error.message || (isArabic
                ? "حدث خطأ في تحميل تصريح الوقوف"
                : "An error occurred while loading your parking permit")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!data) {
    return null
  }

  // Print mode: render only the voucher for PDF capture
  if (isPrintMode) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <VappVoucher
          id="vapp-voucher"
          serialNumber={data.guest.serialNumber}
          guestName={`${data.guest.firstName}${data.guest.lastName ? ` ${data.guest.lastName}` : ""}`}
          venueCode={data.event.venueCode || ""}
          matchCode={data.event.matchCode || ""}
          accessCode={data.category.accessCode || ""}
          categoryName={data.category.name}
          eventName={data.event.name}
          logo={data.branding.logo ?? undefined}
          backgroundImage={data.branding.vappBackgroundImage ?? undefined}
          primaryColor={data.branding.primaryColor ?? undefined}
          locale={locale}
          fontFamily={isArabic ? data.branding.arabicFontFamily : data.branding.fontFamily}
        />
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          {isArabic ? "تصريح دخول مركبة" : "Vehicle Access Parking Permit"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {data.event.name}
        </p>
      </div>

      <VappVoucher
        id="vapp-voucher"
        serialNumber={data.guest.serialNumber}
        guestName={`${data.guest.firstName}${data.guest.lastName ? ` ${data.guest.lastName}` : ""}`}
        venueCode={data.event.venueCode || ""}
        matchCode={data.event.matchCode || ""}
        accessCode={data.category.accessCode || ""}
        categoryName={data.category.name}
        eventName={data.event.name}
        logo={data.branding.logo ?? undefined}
        backgroundImage={data.branding.vappBackgroundImage ?? undefined}
        primaryColor={data.branding.primaryColor ?? undefined}
        locale={locale}
        fontFamily={isArabic ? data.branding.arabicFontFamily : data.branding.fontFamily}
      />

      <VappDownloadButton
        elementId="vapp-voucher"
        filename={`VAPP-${data.guest.serialNumber}`}
        locale={locale}
        token={token}
      />
    </div>
  )
}
