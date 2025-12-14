"use client"

import { useState } from "react"
import { notFound } from "next/navigation"
import { useTranslations } from "next-intl"
import { Download, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { format } from "date-fns"

import { trpc } from "@/trpc/client"
import { PagePanel } from "@/components/global/page-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { createRoute } from "@/lib/routes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { useFormResponses, useFormResponseSummary, useEventFormBySlug } from "@/trpc/hooks/event-forms-hooks"
import type { FormConfig, FormFieldConfig, BilingualText } from "@/server/db/schemas/event-form"

interface FormResponsesPageClientProps {
  workspaceSlug: string
  eventSlug: string
  formSlug: string
}

// Helper to get localized text
function getLocalizedText(text: BilingualText | undefined, locale: string = "en"): string {
  if (!text) return ""
  return (locale === "ar" ? text.ar : text.en) || text.en || ""
}

export function FormResponsesPageClient({
  workspaceSlug,
  eventSlug,
  formSlug,
}: FormResponsesPageClientProps) {
  const t = useTranslations()
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)

  // Fetch event data
  const { data: event, isLoading: isLoadingEvent } = trpc.events.getBySlug.useQuery(
    { workspaceSlug, eventSlug },
    { enabled: !!workspaceSlug && !!eventSlug }
  )

  // Fetch form data
  const { data: form, isLoading: isLoadingForm } = useEventFormBySlug(
    event?.id ?? "",
    formSlug
  )

  // Fetch responses
  const { data: responsesData, isLoading: isLoadingResponses } = useFormResponses(
    form?.id ?? ""
  )

  // Fetch summary
  const { data: summary, isLoading: isLoadingSummary } = useFormResponseSummary(
    form?.id ?? ""
  )

  const isLoading = isLoadingEvent || isLoadingForm || isLoadingResponses || isLoadingSummary

  // Fallback URL for back navigation
  const backHref = form
    ? createRoute("form-detail", { slug: workspaceSlug, eventSlug, formSlug }).href
    : createRoute("event-detail", { slug: workspaceSlug, eventSlug }).href + "?tab=forms"

  if (isLoading) {
    return (
      <PagePanel title={t("formResponses.title")} backHref={backHref}>
        <ResponsesPageSkeleton />
      </PagePanel>
    )
  }

  if (!event || !form) {
    notFound()
  }

  const config = form.formConfig as FormConfig
  const responses = responsesData?.responses || []

  // Get all field definitions for column headers
  const allFields: FormFieldConfig[] = config.sections
    .filter((s) => s.enabled)
    .flatMap((s) => s.fields)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "Submitted At",
      "Guest Name",
      "Guest Email",
      "Category",
      ...allFields.map((f) => getLocalizedText(f.label)),
    ]

    const rows = responses.map((r) => {
      const guest = r.guest
      const responseData = r.responses as Record<string, unknown>

      return [
        r.submittedAt ? format(new Date(r.submittedAt), "yyyy-MM-dd HH:mm") : "",
        guest ? `${guest.firstName} ${guest.lastName}` : "",
        guest?.email || "",
        guest?.categoryName || "",
        ...allFields.map((f) => {
          const value = responseData[f.id]
          if (Array.isArray(value)) return value.join("; ")
          if (typeof value === "boolean") return value ? "Yes" : "No"
          return String(value ?? "")
        }),
      ]
    })

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${form.name}-responses-${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <PagePanel
      title={`${form.name} - ${t("formResponses.title")}`}
      description={t("formResponses.description")}
      backHref={backHref}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("formResponses.totalResponses")}</CardDescription>
              <CardTitle className="text-3xl">{summary?.total ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("formResponses.recentResponses")}</CardDescription>
              <CardTitle className="text-3xl">{summary?.recentResponses ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {t("formResponses.last24Hours")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("formResponses.byCategory")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {summary?.byCategory?.map((cat) => (
                <div key={cat.categoryId || "none"} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cat.categoryName}</span>
                  <span className="font-medium">{cat.count}</span>
                </div>
              ))}
              {(!summary?.byCategory || summary.byCategory.length === 0) && (
                <p className="text-sm text-muted-foreground">{t("formResponses.noResponses")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleExportCsv} disabled={responses.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t("formResponses.exportCsv")}
          </Button>
        </div>

        {/* Responses Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("formResponses.allResponses")}</CardTitle>
            <CardDescription>
              {t("formResponses.allResponsesDescription", { count: responses.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t("formResponses.noResponses")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">{t("formResponses.submittedAt")}</TableHead>
                      <TableHead>{t("formResponses.guest")}</TableHead>
                      <TableHead>{t("formResponses.category")}</TableHead>
                      <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
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
                              {t("formResponses.amended")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {response.guest ? (
                            <div>
                              <p className="font-medium">
                                {response.guest.firstName} {response.guest.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {response.guest.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {response.guest?.categoryName || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedResponse(response.id)}
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

        {/* Response Detail Dialog */}
        <ResponseDetailDialog
          response={responses.find((r) => r.id === selectedResponse) || null}
          config={config}
          open={!!selectedResponse}
          onClose={() => setSelectedResponse(null)}
        />
      </div>
    </PagePanel>
  )
}

// Response Detail Dialog
interface ResponseDetailDialogProps {
  response: {
    id: string
    responses: Record<string, unknown>
    submittedAt: Date | null
    isAmendment: boolean
    guest: {
      firstName: string
      lastName: string
      email: string | null
      categoryName?: string
    } | null
  } | null
  config: FormConfig
  open: boolean
  onClose: () => void
}

function ResponseDetailDialog({ response, config, open, onClose }: ResponseDetailDialogProps) {
  const t = useTranslations()

  if (!response) return null

  const responseData = response.responses as Record<string, unknown>

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("formResponses.responseDetail")}</DialogTitle>
          <DialogDescription>
            {response.guest
              ? `${response.guest.firstName} ${response.guest.lastName}`
              : t("formResponses.unknownGuest")}
            {response.submittedAt && (
              <span className="ml-2">
                - {format(new Date(response.submittedAt), "MMM d, yyyy HH:mm")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {config.sections
            .filter((s) => s.enabled)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((section) => {
              const fieldsWithResponses = section.fields
                .filter((f) => responseData[f.id] !== undefined)
                .sort((a, b) => a.sortOrder - b.sortOrder)

              if (fieldsWithResponses.length === 0) return null

              return (
                <div key={section.id} className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {getLocalizedText(section.title)}
                  </h4>
                  <div className="space-y-2">
                    {fieldsWithResponses.map((field) => {
                      const value = responseData[field.id]
                      return (
                        <div key={field.id} className="grid grid-cols-2 gap-4 py-2 border-b last:border-0">
                          <span className="text-sm font-medium">
                            {getLocalizedText(field.label)}
                          </span>
                          <span className="text-sm">
                            {formatResponseValue(value, field)}
                          </span>
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

// Helper to format response values
function formatResponseValue(value: unknown, field: FormFieldConfig): string {
  if (value === undefined || value === null || value === "") return "-"

  if (Array.isArray(value)) {
    return value
      .map((v) => {
        const option = field.options?.find((o) => o.value === v)
        return option ? getLocalizedText(option.label) : v
      })
      .join(", ")
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (field.type === "select" || field.type === "radio") {
    const option = field.options?.find((o) => o.value === value)
    return option ? getLocalizedText(option.label) : String(value)
  }

  return String(value)
}

function ResponsesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
