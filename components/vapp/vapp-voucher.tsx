"use client"

import Image from "next/image"

interface VappVoucherProps {
  id: string
  serialNumber: string
  guestName: string
  venueCode: string
  matchCode: string
  accessCode: string
  categoryName: string
  eventName: string
  logo?: string
  backgroundImage?: string
  primaryColor?: string
  locale: string
  fontFamily?: string
}

export function VappVoucher({
  id,
  serialNumber,
  guestName,
  venueCode,
  matchCode,
  accessCode,
  categoryName,
  eventName,
  logo,
  backgroundImage,
  primaryColor = "#6366f1",
  locale,
  fontFamily = "Inter, sans-serif",
}: VappVoucherProps) {
  const isArabic = locale === "ar"

  // Template mode: When background image exists, only render text overlays
  // The background image serves as the template with pre-designed boxes/labels
  if (backgroundImage) {
    return (
      <div
        id={id}
        className="relative w-full max-w-md overflow-hidden shadow-2xl"
        style={{ aspectRatio: "3/4" }}
      >
        {/* Background Template Image */}
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />

        {/* Text Overlays at Fixed Positions */}

        {/* Serial Number - Top header bar */}
        <div
          className="absolute"
          style={{
            top: "5%",
            left: "60%",
            right: "3%",
            height: "3.5%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <p style={{
            fontSize: "clamp(8px, 2.8vw, 13px)",
            fontWeight: 700,
            color: "#000000",
            margin: 0,
            fontFamily,
          }}>
            {serialNumber}
          </p>
        </div>

        {/* Venue Code - Right side white box */}
        <div
          className="absolute"
          style={{
            top: "8%",
            left: "50%",
            right: "6%",
            height: "30%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <p style={{
            fontSize: "clamp(32px, 14vw, 68px)",
            fontWeight: 900,
            color: "#000000",
            textAlign: "center",
            margin: 0,
            fontFamily,
          }}>
            {venueCode}
          </p>
        </div>

        {/* Match Code - Bottom left white box */}
        <div
          className="absolute"
          style={{
            top: "42%",
            left: "2%",
            width: "46%",
            height: "26%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <p style={{
            fontSize: "clamp(40px, 17vw, 80px)",
            fontWeight: 900,
            color: "#000000",
            textAlign: "center",
            margin: 0,
            fontFamily,
          }}>
            {matchCode}
          </p>
        </div>

        {/* Access Code - Bottom right white box */}
        <div
          className="absolute"
          style={{
            top: "44%",
            left: "50%",
            right: "8%",
            height: "26%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <p style={{
            fontSize: "clamp(40px, 17vw, 80px)",
            fontWeight: 900,
            color: "#000000",
            textAlign: "center",
            lineHeight: 1,
            margin: 0,
            fontFamily,
          }}>
            {accessCode}
          </p>
          <p style={{
            fontSize: "clamp(12px, 4.5vw, 22px)",
            fontWeight: 700,
            color: "#000000",
            textAlign: "center",
            marginTop: "4px",
            fontFamily,
          }}>
            {categoryName}
          </p>
        </div>
      </div>
    )
  }

  // Default mode: Original layout with gradient background and full UI
  return (
    <div
      id={id}
      className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        aspectRatio: "3/4",
      }}
    >
      {/* Fallback gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}40 100%)`,
        }}
      />

      {/* Content overlay */}
      <div className="relative flex h-full flex-col">
        {/* Header Section */}
        <div className="flex flex-1 flex-col p-6">
          {/* Serial Number - Top Right */}
          <div className={`mb-4 text-${isArabic ? "left" : "right"}`}>
            <span className="text-xs font-medium text-gray-600">
              {isArabic ? "الرقم التسلسلي" : "Serial No."}
            </span>
            <p className="font-mono text-lg font-bold text-gray-900">{serialNumber}</p>
          </div>

          {/* Logo and Event Name */}
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            {logo && (
              <div className="relative h-20 w-40">
                <Image
                  src={logo}
                  alt={eventName}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            <h2 className="text-center text-xl font-bold text-gray-900">{eventName}</h2>
            <p className="text-center text-sm text-gray-600">{guestName}</p>
          </div>

          {/* Venue Code Box */}
          <div
            className="mx-auto mt-4 rounded-lg p-4 text-center"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <span className="text-xs font-medium text-gray-600">
              {isArabic ? "رمز المكان" : "Venue Code"}
            </span>
            <p
              className="text-3xl font-bold"
              style={{ color: primaryColor }}
            >
              {venueCode || "---"}
            </p>
          </div>
        </div>

        {/* Bottom Section - Match Code & Access Code */}
        <div
          className="grid grid-cols-2 gap-4 p-6"
          style={{ backgroundColor: `${primaryColor}10` }}
        >
          {/* Match Code */}
          <div className="rounded-lg bg-white/80 p-4 text-center shadow-sm backdrop-blur-sm">
            <span className="text-xs font-medium text-gray-600">
              {isArabic ? "رمز المطابقة" : "Match Code"}
            </span>
            <p
              className="text-2xl font-bold"
              style={{ color: primaryColor }}
            >
              {matchCode || "---"}
            </p>
          </div>

          {/* Access Code */}
          <div className="rounded-lg bg-white/80 p-4 text-center shadow-sm backdrop-blur-sm">
            <span className="text-xs font-medium text-gray-600">
              {isArabic ? "رمز الدخول" : "Access Code"}
            </span>
            <p
              className="text-2xl font-bold"
              style={{ color: primaryColor }}
            >
              {accessCode || "---"}
            </p>
            <p className="mt-1 text-xs text-gray-500">{categoryName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
