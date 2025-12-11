import { NextRequest, NextResponse } from "next/server"
import { eq, and, gt } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import { guests, events, guestCategories, rsvpResponses, workspaces } from "@/server/db/schemas"
import { getMaterializedColumn, isStandardField } from "@/lib/rsvp"
import { resolveBranding } from "@/lib/branding"

// GET: Fetch guest info by RSVP token (public, no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Find guest by RSVP token
  const guest = await db.query.guests.findFirst({
    where: and(
      eq(guests.rsvpToken, token),
      // Token not expired (or no expiration set)
      gt(guests.rsvpTokenExpiresAt, new Date())
    ),
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
      category: true,
    },
  })

  if (!guest) {
    // Also check if token exists but is expired
    const expiredGuest = await db.query.guests.findFirst({
      where: eq(guests.rsvpToken, token),
    })

    if (expiredGuest) {
      return NextResponse.json({ error: "RSVP link has expired", code: "EXPIRED" }, { status: 410 })
    }

    return NextResponse.json(
      { error: "Invalid RSVP link", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  // Track page visit
  await db
    .update(guests)
    .set({
      lastRsvpPageVisitAt: new Date(),
      status: guest.status === "pending" || guest.status === "invited" ? "viewed" : guest.status,
      updatedAt: new Date(),
    })
    .where(eq(guests.id, guest.id))

  // Build workspace branding with legacy logo fallback
  const workspaceBranding = {
    ...guest.event.workspace.branding,
    logo: guest.event.workspace.branding?.logo ?? guest.event.workspace.logo ?? undefined,
  }

  // Resolve event branding with workspace fallback
  const resolvedBranding = resolveBranding(workspaceBranding, guest.event.branding)

  // Return guest info for RSVP form (exclude sensitive data)
  return NextResponse.json({
    guest: {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      preferredName: guest.preferredName,
      title: guest.title,
      salutation: guest.salutation,
      email: guest.email,
      status: guest.status,
      hasCompanion: guest.hasCompanion,
      companionDetails: guest.companionDetails,
      dietaryRequirements: guest.dietaryRequirements,
      accessibilityNeeds: guest.accessibilityNeeds,
      rsvpRespondedAt: guest.rsvpRespondedAt,
    },
    event: {
      id: guest.event.id,
      name: guest.event.name,
      description: guest.event.description,
      venue: guest.event.venue,
      venueAddress: guest.event.venueAddress,
      startDate: guest.event.startDate,
      endDate: guest.event.endDate,
      timezone: guest.event.timezone,
      rsvpDeadline: guest.event.rsvpDeadline,
      rsvpFormConfig: guest.event.rsvpFormConfig,
      branding: guest.event.branding,
      resolvedBranding,
      settings: guest.event.settings,
      organization: guest.event.workspace,
    },
    category: {
      id: guest.category.id,
      name: guest.category.name,
      code: guest.category.code,
      color: guest.category.color,
      rsvpPageConfig: guest.category.rsvpPageConfig,
      serviceAllocations: guest.category.serviceAllocations,
    },
  })
}

// POST: Submit RSVP response (public, no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Find guest
  const guest = await db.query.guests.findFirst({
    where: and(eq(guests.rsvpToken, token), gt(guests.rsvpTokenExpiresAt, new Date())),
    with: {
      event: true,
    },
  })

  if (!guest) {
    const expiredGuest = await db.query.guests.findFirst({
      where: eq(guests.rsvpToken, token),
    })

    if (expiredGuest) {
      return NextResponse.json({ error: "RSVP link has expired", code: "EXPIRED" }, { status: 410 })
    }

    return NextResponse.json(
      { error: "Invalid RSVP link", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  // Check RSVP deadline
  if (guest.event.rsvpDeadline && guest.event.rsvpDeadline < new Date()) {
    return NextResponse.json(
      { error: "RSVP deadline has passed", code: "DEADLINE_PASSED" },
      { status: 400 }
    )
  }

  const {
    responseStatus,
    formResponses,
    companionInfo,
    dietaryRequirements,
    accessibilityNeeds,
    // New structured format from dynamic form renderer
    standardResponses,
    customResponses,
  } = body

  // Validate response status
  if (!["confirmed", "declined", "maybe"].includes(responseStatus)) {
    return NextResponse.json({ error: "Invalid response status" }, { status: 400 })
  }

  // Check if already responded
  const existingResponse = await db.query.rsvpResponses.findFirst({
    where: eq(rsvpResponses.guestId, guest.id),
    orderBy: (rsvpResponses, { desc }) => [desc(rsvpResponses.submittedAt)],
  })

  // Get client info
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  const userAgent = request.headers.get("user-agent") || "unknown"

  // Build the response data with materialized columns
  const responseData: typeof rsvpResponses.$inferInsert = {
    guestId: guest.id,
    eventId: guest.eventId,
    responseStatus,
    companionInfo,
    ipAddress,
    userAgent,
    isAmendment: !!existingResponse,
    previousResponseId: existingResponse?.id,
  }

  // Process standard responses and map to materialized columns
  if (standardResponses && typeof standardResponses === "object") {
    for (const [fieldKey, value] of Object.entries(standardResponses)) {
      if (isStandardField(fieldKey)) {
        const columnName = getMaterializedColumn(fieldKey)
        if (columnName && value !== undefined && value !== "") {
          // Handle each materialized column explicitly for type safety
          switch (columnName) {
            case "preferredLanguage":
              responseData.preferredLanguage = value as "en" | "ar"
              break
            case "country":
              // Both country_origin and country_traveling_from map to country column
              responseData.country = value as string
              break
            case "arrivalDate":
              responseData.arrivalDate = value ? new Date(value as string) : null
              break
            case "departureDate":
              responseData.departureDate = value ? new Date(value as string) : null
              break
            case "arrivalFlight":
              responseData.arrivalFlight = value as string
              break
            case "departureFlight":
              responseData.departureFlight = value as string
              break
            case "hotelRequired":
              responseData.hotelRequired = value === "yes" || value === true
              break
            case "hotelCheckin":
              responseData.hotelCheckin = value ? new Date(value as string) : null
              break
            case "hotelCheckout":
              responseData.hotelCheckout = value ? new Date(value as string) : null
              break
            case "transportRequired":
              responseData.transportRequired = value === "yes" || value === true
              break
            case "dietaryType":
              responseData.dietaryType = value as typeof responseData.dietaryType
              break
            case "dietaryDetails":
              responseData.dietaryDetails = value as string
              break
            case "accessibilityType":
              responseData.accessibilityType = value as typeof responseData.accessibilityType
              break
            case "accessibilityDetails":
              responseData.accessibilityDetails = value as string
              break
            case "emergencyContactName":
              responseData.emergencyContactName = value as string
              break
            case "emergencyContactPhone":
              responseData.emergencyContactPhone = value as string
              break
            case "sessionsInterested":
              responseData.sessionsInterested = value as string[]
              break
          }
        }
      }
    }
  }

  // Store custom responses in JSON column
  if (customResponses && typeof customResponses === "object" && Object.keys(customResponses).length > 0) {
    responseData.customResponses = customResponses as Record<string, unknown>
  }

  // Keep formResponses as full backup (legacy format compatibility)
  if (formResponses) {
    responseData.formResponses = formResponses
  } else if (standardResponses || customResponses) {
    // Create formResponses backup from new format
    responseData.formResponses = {
      ...(standardResponses as Record<string, unknown>),
      custom: customResponses,
    }
  }

  // Create RSVP response
  const [response] = await db
    .insert(rsvpResponses)
    .values(responseData)
    .returning()

  // Update guest status and details
  const updateData: Record<string, unknown> = {
    status: responseStatus,
    rsvpRespondedAt: new Date(),
    updatedAt: new Date(),
  }

  // Update companion info if provided
  if (companionInfo) {
    updateData.hasCompanion = companionInfo.bringing || false
    if (companionInfo.details && companionInfo.details.length > 0) {
      updateData.companionDetails = companionInfo.details[0]
    }
  }

  // Update dietary/accessibility if provided
  if (dietaryRequirements !== undefined) {
    updateData.dietaryRequirements = dietaryRequirements
  }
  if (accessibilityNeeds !== undefined) {
    updateData.accessibilityNeeds = accessibilityNeeds
  }

  await db.update(guests).set(updateData).where(eq(guests.id, guest.id))

  return NextResponse.json({
    success: true,
    responseId: response.id,
    status: responseStatus,
    isAmendment: !!existingResponse,
    message:
      responseStatus === "confirmed"
        ? "Thank you for confirming your attendance!"
        : responseStatus === "declined"
          ? "Thank you for letting us know."
          : "Thank you for your response.",
  })
}
