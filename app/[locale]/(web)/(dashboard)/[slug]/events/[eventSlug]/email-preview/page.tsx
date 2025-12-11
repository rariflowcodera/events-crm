"use client"

import { useState, useMemo, useEffect, use } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { format } from "date-fns"

import { useEventBySlug } from "@/trpc/hooks/events-hooks"
import { useGuests } from "@/trpc/hooks/guests-hooks"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"

interface EmailPreviewPageProps {
  params: Promise<{ slug: string; eventSlug: string }>
}

// Helper to format dates
function formatDate(date: Date | null | undefined): string {
  if (!date) return ""
  return format(new Date(date), "MMMM d, yyyy")
}

type PreviewData = {
  guest?: Record<string, string | null | undefined>
  event?: Record<string, string | null | undefined>
  rsvp?: Record<string, string | null | undefined>
  category?: Record<string, string | null | undefined>
}

// Variable replacement function
function replaceVariables(content: string, data: PreviewData): string {
  return content.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, group, key) => {
    const groupData = data[group as keyof PreviewData]
    if (!groupData) return match

    const value = groupData[key]
    return value ?? match
  })
}

// Type for sessionStorage preview data
type EmailPreviewData = {
  subject: string
  html: string
  text: string
  lang: "en" | "ar"
}

export default function EmailPreviewPage({ params }: EmailPreviewPageProps) {
  const t = useTranslations("emailTemplate")

  // Resolve async params using React's use()
  const { slug, eventSlug } = use(params)

  // State for template content from sessionStorage
  const [templateData, setTemplateData] = useState<EmailPreviewData | null>(null)

  // Load template content from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("emailPreviewData")
    if (stored) {
      try {
        setTemplateData(JSON.parse(stored))
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  // Extract values from template data
  const subject = templateData?.subject || ""
  const htmlContent = templateData?.html || ""
  const textContent = templateData?.text || ""
  const language = templateData?.lang || "en"

  // State
  const [selectedGuestId, setSelectedGuestId] = useState<string>("")

  // Fetch event data
  const { data: event, isLoading: isLoadingEvent } = useEventBySlug(slug, eventSlug)

  // Fetch guests for dropdown (limit to 50 for performance)
  const { data: guestsData, isLoading: isLoadingGuests } = useGuests({
    eventId: event?.id || "",
    limit: 50,
  })

  const guests = guestsData?.guests || []

  // Get selected guest
  const selectedGuest = useMemo(() => {
    if (!selectedGuestId && guests.length > 0) return guests[0]
    return guests.find((g) => g.id === selectedGuestId) || guests[0]
  }, [selectedGuestId, guests])

  // Build preview data
  const previewData = useMemo(() => {
    const guestData = selectedGuest
      ? {
          firstName: selectedGuest.firstName,
          lastName: selectedGuest.lastName,
          fullName: [selectedGuest.firstName, selectedGuest.lastName].filter(Boolean).join(" "),
          title: selectedGuest.title,
          salutation: selectedGuest.salutation,
          email: selectedGuest.email,
          position: selectedGuest.position,
          entity: selectedGuest.entity,
          category: selectedGuest.category?.name || "Guest",
        }
      : undefined

    const eventData = event
      ? {
          name: event.name,
          venue: event.venue,
          venueAddress: event.venueAddress,
          startDate: formatDate(event.startDate),
          endDate: formatDate(event.endDate),
          rsvpDeadline: formatDate(event.rsvpDeadline),
        }
      : undefined

    const rsvpData = selectedGuest
      ? {
          link: `${typeof window !== "undefined" ? window.location.origin : ""}/rsvp/${selectedGuest.rsvpToken}`,
          confirmLink: `${typeof window !== "undefined" ? window.location.origin : ""}/rsvp/${selectedGuest.rsvpToken}?action=confirm`,
          declineLink: `${typeof window !== "undefined" ? window.location.origin : ""}/rsvp/${selectedGuest.rsvpToken}?action=decline`,
        }
      : undefined

    const categoryData = selectedGuest?.category
      ? {
          name: selectedGuest.category.name,
          services: "", // Could be extended with actual services
        }
      : undefined

    return { guest: guestData, event: eventData, rsvp: rsvpData, category: categoryData }
  }, [selectedGuest, event])

  // Render content with variables replaced
  const renderedSubject = useMemo(
    () => replaceVariables(subject, previewData),
    [subject, previewData]
  )
  const renderedHtml = useMemo(
    () => replaceVariables(htmlContent, previewData),
    [htmlContent, previewData]
  )
  const renderedText = useMemo(
    () => replaceVariables(textContent, previewData),
    [textContent, previewData]
  )

  const direction = language === "ar" ? "rtl" : "ltr"
  const isLoading = isLoadingEvent || isLoadingGuests || templateData === null

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b bg-background p-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    )
  }

  const backUrl = `/${slug}/events/${eventSlug}?tab=emails`

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={backUrl}>
                <Icons.arrowLeft className="mr-2 h-4 w-4" />
                Back to Template
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">{t("preview")}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Guest selector */}
          <div className="flex items-center gap-4 rounded-lg border bg-background p-4">
            <span className="text-sm font-medium text-muted-foreground">
              Preview as guest:
            </span>
            {guests.length > 0 ? (
              <Select
                value={selectedGuestId || guests[0]?.id || ""}
                onValueChange={setSelectedGuestId}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a guest" />
                </SelectTrigger>
                <SelectContent>
                  {guests.map((guest) => (
                    <SelectItem key={guest.id} value={guest.id}>
                      {[guest.firstName, guest.lastName].filter(Boolean).join(" ") ||
                        guest.email}
                      {guest.category && (
                        <span className="ml-2 text-muted-foreground">
                          ({guest.category.name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-muted-foreground">
                No guests found - add guests to preview with real data
              </span>
            )}
          </div>

          {/* Subject preview */}
          <div className="rounded-lg border bg-background p-4">
            <span className="text-sm font-medium text-muted-foreground">Subject: </span>
            <span className="text-sm">{renderedSubject || "(No subject)"}</span>
          </div>

          {/* Content tabs */}
          <Tabs defaultValue="html" className="rounded-lg border bg-background">
            <div className="border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="text">Plain Text</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="html" className="m-0">
              <div className="bg-white dark:bg-zinc-950">
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html dir="${direction}">
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body {
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                          margin: 0;
                          padding: 24px;
                          line-height: 1.6;
                          color: #1a1a1a;
                        }
                        a { color: #2563eb; }
                        img { max-width: 100%; height: auto; }
                      </style>
                    </head>
                    <body>${renderedHtml || "<p>No HTML content</p>"}</body>
                    </html>
                  `}
                  sandbox="allow-same-origin"
                  className="h-[calc(100vh-400px)] min-h-[500px] w-full border-0"
                  title="Email Preview"
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="m-0">
              <ScrollArea className="h-[calc(100vh-400px)] min-h-[500px]">
                <pre
                  className="whitespace-pre-wrap p-6 font-mono text-sm"
                  dir={direction}
                >
                  {renderedText || "No plain text content provided"}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
