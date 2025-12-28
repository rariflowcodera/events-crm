import { NextRequest, NextResponse } from "next/server"
import { eq, or } from "drizzle-orm"
import satori from "satori"
import sharp from "sharp"
import { db } from "@/server/db/config/database"
import { guests } from "@/server/db/schemas"
import { resolveBranding } from "@/lib/branding"
import { loadOgFonts } from "@/lib/og-fonts"

// Cache control: cache for 1 hour, stale-while-revalidate for 1 day
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    // Fetch guest and event data
    const guest = await db.query.guests.findFirst({
      where: or(eq(guests.rsvpToken, token), eq(guests.rsvpShortCode, token)),
      with: {
        event: {
          with: {
            workspace: {
              columns: {
                name: true,
                logo: true,
                branding: true,
              },
            },
          },
        },
      },
    })

    if (!guest?.event) {
      return generateFallbackImage()
    }

    const event = guest.event

    // Resolve branding with workspace fallback
    const workspaceBranding = {
      ...event.workspace.branding,
      logo:
        event.workspace.branding?.logo ?? event.workspace.logo ?? undefined,
    }
    const branding = resolveBranding(workspaceBranding, event.branding)

    // Format date - use UTC to avoid timezone shifts
    const formattedDate = event.startDate
      ? new Date(event.startDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        })
      : null

    // Load fonts
    const fonts = await loadOgFonts()

    // Fetch logo as base64 if available
    let logoBase64: string | undefined
    if (branding.logo) {
      try {
        logoBase64 = await fetchImageAsBase64(branding.logo)
      } catch {
        // Ignore logo fetch errors
      }
    }

    // Generate SVG using Satori
    const svg = await satori(
      <OgImageTemplate
        eventName={event.name}
        eventNameAr={event.nameAr}
        date={formattedDate}
        time={event.startTime}
        venue={event.venue}
        logo={logoBase64}
        primaryColor={branding.primaryColor || "#1a1a2e"}
        secondaryColor={branding.secondaryColor || "#16213e"}
        backgroundImage={branding.backgroundImage}
      />,
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: "Inter", data: fonts.inter, weight: 600, style: "normal" },
          {
            name: "Noto Sans Arabic",
            data: fonts.notoSansArabic,
            weight: 600,
            style: "normal",
          },
        ],
      }
    )

    // Convert SVG to PNG using Sharp
    const png = await sharp(Buffer.from(svg)).png().toBuffer()

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": CACHE_CONTROL,
      },
    })
  } catch (error) {
    console.error("Error generating OG image:", error)
    return generateFallbackImage()
  }
}

/**
 * Fetch an image URL and convert to base64 data URI
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(imageUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })
    if (!response.ok) return undefined

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const contentType = response.headers.get("content-type") || "image/png"

    return `data:${contentType};base64,${base64}`
  } catch {
    return undefined
  }
}

/**
 * OG Image Template Component
 * Rendered to SVG by Satori
 */
function OgImageTemplate({
  eventName,
  eventNameAr,
  date,
  time,
  venue,
  logo,
  primaryColor,
  secondaryColor,
  backgroundImage,
}: {
  eventName: string
  eventNameAr?: string | null
  date?: string | null
  time?: string | null
  venue?: string | null
  logo?: string
  primaryColor: string
  secondaryColor: string
  backgroundImage?: string | null
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px",
        background: backgroundImage
          ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8))`
          : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "Inter, Noto Sans Arabic, sans-serif",
        color: "white",
      }}
    >
      {/* Top: Logo */}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {logo && (
          <img
            src={logo}
            alt=""
            style={{ height: 80, maxWidth: 300, objectFit: "contain" }}
          />
        )}
      </div>

      {/* Center: Event Info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Event Name (English) */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 600,
            lineHeight: 1.2,
            margin: 0,
            textShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
        >
          {eventName}
        </h1>

        {/* Event Name (Arabic) - if different */}
        {eventNameAr && eventNameAr !== eventName && (
          <h2
            style={{
              fontSize: 42,
              fontWeight: 600,
              lineHeight: 1.2,
              margin: 0,
              direction: "rtl",
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
          >
            {eventNameAr}
          </h2>
        )}

        {/* Date, Time, Venue */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontSize: 28,
            opacity: 0.9,
            marginTop: "8px",
          }}
        >
          {(date || time) && (
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              {date && (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CalendarIcon />
                  {date}
                </span>
              )}
              {time && (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ClockIcon />
                  {time}
                </span>
              )}
            </div>
          )}

          {venue && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: 24,
                opacity: 0.8,
              }}
            >
              <LocationIcon />
              {venue}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: RSVP Call to Action */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          Confirm Your Attendance
        </div>
      </div>
    </div>
  )
}

// Simple SVG Icons
function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}

/**
 * Generate fallback OG image for errors
 */
async function generateFallbackImage() {
  const fonts = await loadOgFonts()

  const svg = await satori(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        fontFamily: "Inter, sans-serif",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: 48 }}>Event Invitation</h1>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Inter", data: fonts.inter, weight: 600, style: "normal" }],
    }
  )

  const png = await sharp(Buffer.from(svg)).png().toBuffer()

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400", // Longer cache for fallback
    },
  })
}
