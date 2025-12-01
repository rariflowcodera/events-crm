"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SummaryStats,
  BreakdownChart,
  TimelineChart,
  LogisticsTable,
  ResponsesTable,
} from "@/components/rsvp-reports"
import {
  useRsvpSummary,
  useDietaryBreakdown,
  useAccessibilityBreakdown,
  useArrivalTimeline,
  useDepartureTimeline,
  useHotelRequirements,
  useTransportRequirements,
  useRsvpResponses,
} from "@/trpc/hooks/rsvp-reports-hooks"

type EventStatus = "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"

interface GuestCategory {
  id: string
  name: string
  code: string
  description: string | null
  color: string | null
  sortOrder: number
}

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  eventType: string | null
  venue: string | null
  venueAddress: string | null
  startDate: Date | null
  endDate: Date | null
  rsvpDeadline: Date | null
  maxGuests: number | null
  status: EventStatus
  branding: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
  } | null
  settings: {
    allowPlusOne?: boolean
    maxPlusOnes?: number
    requireApproval?: boolean
    sendReminders?: boolean
    reminderDays?: number[]
  } | null
  guestCategories: GuestCategory[]
  createdAt: Date
}

interface EventReportsTabProps {
  event: Event
  workspaceSlug: string
}

const DIETARY_LABELS: Record<string, string> = {
  none: "No restrictions",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  gluten_free: "Gluten-free",
  other: "Other",
}

const ACCESSIBILITY_LABELS: Record<string, string> = {
  none: "None",
  wheelchair: "Wheelchair access",
  hearing: "Hearing assistance",
  visual: "Visual assistance",
  mobility: "Mobility assistance",
  other: "Other",
}

export function EventReportsTab({ event, workspaceSlug }: EventReportsTabProps) {
  const t = useTranslations("rsvpReports")
  const [activeSubTab, setActiveSubTab] = useState("summary")

  // Fetch data - hooks only need eventId, permission check is done internally using event's workspace
  const { data: summary, isLoading: summaryLoading } = useRsvpSummary(event.id)
  const { data: dietaryData, isLoading: dietaryLoading } = useDietaryBreakdown(event.id)
  const { data: accessibilityData, isLoading: accessibilityLoading } = useAccessibilityBreakdown(event.id)
  const { data: arrivalData, isLoading: arrivalLoading } = useArrivalTimeline(event.id)
  const { data: departureData, isLoading: departureLoading } = useDepartureTimeline(event.id)
  const { data: hotelData, isLoading: hotelLoading } = useHotelRequirements(event.id)
  const { data: transportData, isLoading: transportLoading } = useTransportRequirements(event.id)
  const { data: responsesData, isLoading: responsesLoading } = useRsvpResponses(event.id)

  // For export, we'll trigger a manual download (could be enhanced to use mutations)
  const handleExport = async (format: "csv" | "json" = "csv") => {
    // Simple export - in a real implementation, this could call an API endpoint
    // that returns a downloadable file
    if (!responsesData?.responses) return

    const exportContent = JSON.stringify(responsesData.responses, null, 2)
    const blob = new Blob([exportContent], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rsvp-export-${event.slug}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Default stats if loading
  const stats = summary || {
    total: 0,
    confirmed: 0,
    declined: 0,
    maybe: 0,
    pending: 0,
    withDietaryNeeds: 0,
    withAccessibilityNeeds: 0,
    needingHotel: 0,
    needingTransport: 0,
  }

  // Map responses to table format
  const tableResponses = (responsesData?.responses || []).map((r) => ({
    id: r.response.id,
    guestName: `${r.guest.firstName || ""} ${r.guest.lastName || ""}`.trim(),
    guestEmail: r.guest.email || undefined,
    categoryName: r.category?.name || "",
    categoryCode: r.category?.name || "",
    status: r.response.responseStatus as "confirmed" | "declined" | "maybe" | "pending",
    dietaryType: r.response.dietaryType || undefined,
    accessibilityType: r.response.accessibilityType || undefined,
    hotelRequired: r.response.hotelRequired || false,
    transportRequired: r.response.transportRequired || false,
    submittedAt: r.response.submittedAt || undefined,
  }))

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => handleExport("json")}
          disabled={responsesLoading}
        >
          <Download className="h-4 w-4 mr-2" />
          {t("exportAll")}
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="summary">{t("summary")}</TabsTrigger>
          <TabsTrigger value="dietary">{t("dietary")}</TabsTrigger>
          <TabsTrigger value="logistics">{t("logistics")}</TabsTrigger>
          <TabsTrigger value="responses">{t("responses")}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6 space-y-6">
          <SummaryStats stats={stats} isLoading={summaryLoading} />

          {/* Timeline charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TimelineChart
              title={t("arrivalTimeline")}
              description={t("arrivalTimelineDescription")}
              data={arrivalData || []}
              isLoading={arrivalLoading}
              color="#22c55e"
            />
            <TimelineChart
              title={t("departureTimeline")}
              description={t("departureTimelineDescription")}
              data={departureData || []}
              isLoading={departureLoading}
              color="#ef4444"
            />
          </div>
        </TabsContent>

        <TabsContent value="dietary" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownChart
              title={t("dietaryBreakdown")}
              description={t("dietaryBreakdownDescription")}
              data={dietaryData || []}
              isLoading={dietaryLoading}
              labels={DIETARY_LABELS}
            />
            <BreakdownChart
              title={t("accessibilityBreakdown")}
              description={t("accessibilityBreakdownDescription")}
              data={accessibilityData || []}
              isLoading={accessibilityLoading}
              labels={ACCESSIBILITY_LABELS}
            />
          </div>
        </TabsContent>

        <TabsContent value="logistics" className="mt-6">
          <LogisticsTable
            hotelData={(hotelData || []).map((h) => ({
              guestId: h.guestId,
              guestName: h.guestName,
              checkin: h.checkin,
              checkout: h.checkout,
              category: h.category,
            }))}
            transportData={(transportData || []).map((t) => ({
              guestId: t.guestId,
              guestName: t.guestName,
              arrivalDate: t.arrivalDate,
              arrivalFlight: t.arrivalFlight,
              departureDate: t.departureDate,
              departureFlight: t.departureFlight,
              category: t.category,
            }))}
            isLoading={hotelLoading || transportLoading}
            onExport={(type) => {
              // Could implement specific export for hotel/transport
              handleExport("csv")
            }}
          />
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <ResponsesTable
            data={tableResponses}
            categories={event.guestCategories}
            isLoading={responsesLoading}
            onExport={() => handleExport("csv")}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
