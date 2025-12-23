"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Download, Eye, CheckCircle2, XCircle, HelpCircle } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { SummaryStats } from "@/components/rsvp-reports"
import { useRsvpSummary, useRsvpResponses, useRsvpByCategory, useRsvpTimeline } from "@/trpc/hooks/rsvp-reports-hooks"
import { STANDARD_FIELDS } from "@/lib/rsvp/standard-fields"
import { createDefaultFormConfig } from "@/lib/rsvp/standard-fields"
import type { RsvpFormConfig, BilingualText } from "@/server/db/schemas/event"

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
  rsvpFormConfig?: RsvpFormConfig | null
  guestCategories: GuestCategory[]
  createdAt: Date
}

interface EventReportsTabProps {
  event: Event
  workspaceSlug: string
}

// Helper to get localized text
function getLocalizedText(text: BilingualText | undefined, locale: string = "en"): string {
  if (!text) return ""
  return (locale === "ar" ? text.ar : text.en) || text.en || ""
}

export function EventReportsTab({ event, workspaceSlug }: EventReportsTabProps) {
  const t = useTranslations("rsvpReports")
  const [activeSubTab, setActiveSubTab] = useState("summary")
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null)

  // Fetch data
  const { data: summary, isLoading: summaryLoading } = useRsvpSummary(event.id)
  const { data: responsesData, isLoading: responsesLoading } = useRsvpResponses(event.id)
  const { data: categoryData, isLoading: categoryLoading } = useRsvpByCategory(event.id)
  const { data: timelineData, isLoading: timelineLoading } = useRsvpTimeline(event.id)

  // Get form config (or default)
  const formConfig = event.rsvpFormConfig ?? createDefaultFormConfig()

  // Get enabled fields for CSV export and detail dialog
  const enabledFields = getEnabledFields(formConfig)

  // CSV export - dynamically detects which fields have data to preserve historical responses
  const handleExportCsv = () => {
    if (!responsesData?.responses) return

    // Scan responses to find which standard fields have data
    const fieldsWithData = new Set<string>()
    const customFieldKeys = new Set<string>()

    responsesData.responses.forEach((r) => {
      const response = r.response as Record<string, unknown>

      // Check each standard field for data
      Object.values(STANDARD_FIELDS).forEach((field) => {
        const value = response[field.materializedColumn]
        if (value !== null && value !== undefined && value !== "") {
          fieldsWithData.add(field.fieldKey)
        }
      })

      // Collect custom field keys that have data
      const customResponses = response.customResponses as Record<string, unknown> | undefined
      if (customResponses) {
        Object.entries(customResponses).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            customFieldKeys.add(key)
          }
        })
      }
    })

    // Get only standard fields that have data (preserves historical data even if field now disabled)
    const standardFieldsToExport = Object.values(STANDARD_FIELDS)
      .filter((f) => fieldsWithData.has(f.fieldKey))

    // Build headers: fixed columns + standard fields with data + custom fields with data
    const headers = [
      "Submitted At",
      "Guest Name",
      "Email",
      "Category",
      "Status",
      ...standardFieldsToExport.map((f) => getLocalizedText(f.label)),
      ...Array.from(customFieldKeys).map((key) => `Custom: ${key}`),
    ]

    // Build rows with only the detected fields
    const rows = responsesData.responses.map((r) => {
      const response = r.response as Record<string, unknown>
      const customResponses = response.customResponses as Record<string, unknown> | undefined

      return [
        // Fixed columns
        r.response.submittedAt ? format(new Date(r.response.submittedAt), "yyyy-MM-dd HH:mm") : "",
        `${r.guest.firstName || ""} ${r.guest.lastName || ""}`.trim(),
        r.guest.email || "",
        r.category?.name || "",
        r.response.responseStatus || "",
        // Standard fields with data
        ...standardFieldsToExport.map((f) => {
          const value = response[f.materializedColumn]
          return formatValueForCsv(value, {
            fieldKey: f.fieldKey,
            label: f.label,
            materializedColumn: f.materializedColumn,
            type: f.type,
            options: f.options,
          })
        }),
        // Custom fields with data
        ...Array.from(customFieldKeys).map((key) => {
          const value = customResponses?.[key]
          if (value === undefined || value === null) return ""
          if (typeof value === "boolean") return value ? "Yes" : "No"
          if (Array.isArray(value)) return value.join("; ")
          return String(value)
        }),
      ]
    })

    // Create CSV
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `rsvp-responses-${event.slug}-${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Default stats if loading
  const stats = summary
    ? {
        total: summary.total,
        confirmed: summary.confirmed,
        declined: summary.declined,
        maybe: summary.maybe,
        pending: summary.pending,
      }
    : {
        total: 0,
        confirmed: 0,
        declined: 0,
        maybe: 0,
        pending: 0,
      }

  // Map responses to simple format
  const responses = (responsesData?.responses || []).map((r) => ({
    id: r.response.id,
    guestName: `${r.guest.firstName || ""} ${r.guest.lastName || ""}`.trim(),
    guestEmail: r.guest.email || "",
    categoryName: r.category?.name || "",
    status: r.response.responseStatus as "confirmed" | "declined" | "maybe" | "pending",
    submittedAt: r.response.submittedAt,
    isAmendment: r.response.isAmendment || false,
    response: r.response,
    guest: r.guest,
    category: r.category,
  }))

  // Calculate recent responses (last 24 hours)
  const recentCount = responses.filter((r) => {
    if (!r.submittedAt) return false
    const submitted = new Date(r.submittedAt)
    const now = new Date()
    const diff = now.getTime() - submitted.getTime()
    return diff < 24 * 60 * 60 * 1000
  }).length

  // Find selected response for detail dialog
  const selectedResponse = responses.find((r) => r.id === selectedResponseId)

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="summary">{t("summary")}</TabsTrigger>
          <TabsTrigger value="responses">{t("responses")}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <SummaryStats
            stats={stats}
            timelineData={timelineData}
            isLoading={summaryLoading || timelineLoading}
          />
        </TabsContent>

        <TabsContent value="responses" className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("totalResponses")}</CardDescription>
                <CardTitle className="text-3xl">{responses.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("recentResponses")}</CardDescription>
                <CardTitle className="text-3xl">{recentCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{t("last24Hours")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("byCategory")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {categoryData?.map((cat) => (
                  <div key={cat.categoryId || "none"} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{cat.categoryName}</span>
                    <span className="font-medium">{cat.confirmed + cat.declined + cat.maybe}</span>
                  </div>
                ))}
                {(!categoryData || categoryData.length === 0) && (
                  <p className="text-sm text-muted-foreground">{t("noResponses")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={responsesLoading || responses.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {t("exportCsv")}
            </Button>
          </div>

          {/* Responses Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("allResponses")}</CardTitle>
              <CardDescription>
                {t("showingResponses", { count: responses.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t("noResponses")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">{t("submittedAt")}</TableHead>
                        <TableHead>{t("guest")}</TableHead>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="w-[80px]">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((response) => (
                        <TableRow key={response.id}>
                          <TableCell className="text-sm">
                            {response.submittedAt
                              ? format(new Date(response.submittedAt), "MMM d, yyyy HH:mm")
                              : "-"}
                            {response.isAmendment && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {t("amended")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{response.guestName || "-"}</p>
                              <p className="text-sm text-muted-foreground">{response.guestEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{response.categoryName || "-"}</TableCell>
                          <TableCell>
                            <StatusBadge status={response.status} />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedResponseId(response.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Response Detail Dialog */}
      <ResponseDetailDialog
        response={selectedResponse || null}
        formConfig={formConfig}
        open={!!selectedResponseId}
        onClose={() => setSelectedResponseId(null)}
      />
    </div>
  )
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("rsvpReports")

  const config = {
    confirmed: { icon: CheckCircle2, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    declined: { icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    maybe: { icon: HelpCircle, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    pending: { icon: HelpCircle, className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  }

  const statusConfig = config[status as keyof typeof config] || config.pending
  const Icon = statusConfig.icon

  return (
    <Badge variant="outline" className={statusConfig.className}>
      <Icon className="h-3 w-3 mr-1" />
      {t(status as "confirmed" | "declined" | "maybe" | "pending")}
    </Badge>
  )
}

// Response Detail Dialog
interface ResponseDetailDialogProps {
  response: {
    id: string
    response: Record<string, unknown>
    guest: { firstName: string; lastName: string | null; email: string | null }
    category: { name: string } | null
  } | null
  formConfig: RsvpFormConfig
  open: boolean
  onClose: () => void
}

function ResponseDetailDialog({ response, formConfig, open, onClose }: ResponseDetailDialogProps) {
  const t = useTranslations("rsvpReports")

  if (!response) return null

  const rsvpResponse = response.response as Record<string, unknown>

  // Get enabled sections and fields
  const enabledSections = formConfig.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("responseDetail")}</DialogTitle>
          <DialogDescription>
            {response.guest.firstName} {response.guest.lastName}
            {rsvpResponse.submittedAt ? (
              <span className="ml-2">
                - {format(new Date(rsvpResponse.submittedAt as string), "MMM d, yyyy HH:mm")}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Response Status */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {t("status")}
            </h4>
            <div className="grid grid-cols-2 gap-4 py-2 border-b">
              <span className="text-sm font-medium">{t("rsvpStatus")}</span>
              <span className="text-sm">
                <StatusBadge status={rsvpResponse.responseStatus as string} />
              </span>
            </div>
          </div>

          {/* Form sections */}
          {enabledSections.map((section) => {
            const enabledFields = section.standardFields.filter((f) => f.enabled)
            const fieldsWithValues = enabledFields.filter((fieldConfig) => {
              const fieldDef = STANDARD_FIELDS[fieldConfig.fieldKey]
              if (!fieldDef) return false
              const value = rsvpResponse[fieldDef.materializedColumn]
              return value !== undefined && value !== null && value !== ""
            })

            // Also check custom fields
            const customFieldsWithValues = section.customFields.filter((cf) => {
              const customResponses = rsvpResponse.customResponses as Record<string, unknown> | undefined
              if (!customResponses) return false
              const value = customResponses[cf.id]
              return value !== undefined && value !== null && value !== ""
            })

            if (fieldsWithValues.length === 0 && customFieldsWithValues.length === 0) {
              return null
            }

            return (
              <div key={section.id} className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {getLocalizedText(section.title)}
                </h4>
                <div className="space-y-2">
                  {fieldsWithValues.map((fieldConfig) => {
                    const fieldDef = STANDARD_FIELDS[fieldConfig.fieldKey]
                    if (!fieldDef) return null

                    const value = rsvpResponse[fieldDef.materializedColumn]
                    const label = fieldConfig.labelOverride
                      ? getLocalizedText(fieldConfig.labelOverride)
                      : getLocalizedText(fieldDef.label)

                    return (
                      <div key={fieldConfig.fieldKey} className="grid grid-cols-2 gap-4 py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm">{formatResponseValue(value, fieldDef)}</span>
                      </div>
                    )
                  })}

                  {/* Custom fields */}
                  {customFieldsWithValues.map((cf) => {
                    const customResponses = rsvpResponse.customResponses as Record<string, unknown>
                    const value = customResponses?.[cf.id]

                    return (
                      <div key={cf.id} className="grid grid-cols-2 gap-4 py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{getLocalizedText(cf.label)}</span>
                        <span className="text-sm">{formatCustomValue(value, cf)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper types and functions
interface EnabledField {
  fieldKey: string
  label: BilingualText
  materializedColumn: string
  type: string
  options?: Array<{ value: string; label: BilingualText }>
}

function getEnabledFields(formConfig: RsvpFormConfig): EnabledField[] {
  const fields: EnabledField[] = []

  for (const section of formConfig.sections) {
    if (!section.enabled) continue

    for (const fieldConfig of section.standardFields) {
      if (!fieldConfig.enabled) continue

      const fieldDef = STANDARD_FIELDS[fieldConfig.fieldKey]
      if (!fieldDef) continue

      fields.push({
        fieldKey: fieldConfig.fieldKey,
        label: fieldConfig.labelOverride || fieldDef.label,
        materializedColumn: fieldDef.materializedColumn,
        type: fieldDef.type,
        options: fieldDef.options,
      })
    }
  }

  return fields
}

function formatResponseValue(value: unknown, fieldDef: { type: string; options?: Array<{ value: string; label: BilingualText }> }): string {
  if (value === undefined || value === null || value === "") return "-"

  // Handle boolean values (stored as "yes"/"no" or true/false)
  if (fieldDef.type === "radio" && (value === true || value === "yes")) return "Yes"
  if (fieldDef.type === "radio" && (value === false || value === "no")) return "No"

  // Handle dates
  if (fieldDef.type === "date" && value instanceof Date) {
    return format(value, "MMM d, yyyy")
  }
  if (fieldDef.type === "date" && typeof value === "string") {
    try {
      return format(new Date(value), "MMM d, yyyy")
    } catch {
      return String(value)
    }
  }

  // Handle select/radio with options
  if ((fieldDef.type === "select" || fieldDef.type === "radio") && fieldDef.options) {
    const option = fieldDef.options.find((o) => o.value === value)
    if (option) return getLocalizedText(option.label)
  }

  // Handle checkbox (arrays)
  if (fieldDef.type === "checkbox" && Array.isArray(value)) {
    return value
      .map((v) => {
        const option = fieldDef.options?.find((o) => o.value === v)
        return option ? getLocalizedText(option.label) : v
      })
      .join(", ")
  }

  return String(value)
}

function formatCustomValue(value: unknown, fieldDef: { type: string; options?: Array<{ value: string; label: BilingualText }> }): string {
  if (value === undefined || value === null || value === "") return "-"

  if (typeof value === "boolean") return value ? "Yes" : "No"

  if (Array.isArray(value)) {
    return value
      .map((v) => {
        const option = fieldDef.options?.find((o) => o.value === v)
        return option ? getLocalizedText(option.label) : v
      })
      .join(", ")
  }

  if ((fieldDef.type === "select" || fieldDef.type === "radio") && fieldDef.options) {
    const option = fieldDef.options.find((o) => o.value === value)
    if (option) return getLocalizedText(option.label)
  }

  return String(value)
}

function formatValueForCsv(value: unknown, field: EnabledField): string {
  if (value === undefined || value === null) return ""

  if (value === true || value === "yes") return "Yes"
  if (value === false || value === "no") return "No"

  if (field.type === "date") {
    if (value instanceof Date) return format(value, "yyyy-MM-dd")
    if (typeof value === "string") {
      try {
        return format(new Date(value), "yyyy-MM-dd")
      } catch {
        return value
      }
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((v) => {
        const option = field.options?.find((o) => o.value === v)
        return option ? getLocalizedText(option.label) : v
      })
      .join("; ")
  }

  if ((field.type === "select" || field.type === "radio") && field.options) {
    const option = field.options.find((o) => o.value === value)
    if (option) return getLocalizedText(option.label)
  }

  return String(value)
}
