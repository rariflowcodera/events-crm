"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/global/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { RsvpFormBuilder } from "@/components/rsvp-form-builder"
import { FormCard } from "@/components/forms/form-card"
import { CreateFormDialog } from "@/components/forms/create-form-dialog"
import { useEventForms } from "@/trpc/hooks/event-forms-hooks"

type EventStatus =
  | "draft"
  | "planning"
  | "invitations_sent"
  | "rsvp_open"
  | "rsvp_closed"
  | "in_progress"
  | "completed"
  | "cancelled"

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

interface EventFormsTabProps {
  event: Event
  workspaceSlug: string
}

type ViewMode = "list" | "rsvp-builder"

export function EventFormsTab({ event, workspaceSlug }: EventFormsTabProps) {
  const t = useTranslations()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data: forms, isLoading: formsLoading } = useEventForms(event.id)

  // Show RSVP builder when in that mode
  if (viewMode === "rsvp-builder") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setViewMode("list")} className="mb-2">
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
        <RsvpFormBuilder
          eventId={event.id}
          workspaceSlug={workspaceSlug}
          categories={event.guestCategories}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* RSVP Form Section */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">{t("forms.rsvpForm")}</h3>
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => setViewMode("rsvp-builder")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icons.formInput className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t("forms.rsvpFormTitle")}</CardTitle>
                  <CardDescription className="mt-1">
                    {t("forms.rsvpFormDescription")}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary">{t("forms.primary")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t("forms.clickToEdit")}</span>
              <Icons.arrowRight className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Forms Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("forms.additionalForms")}</h3>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Icons.plus className="mr-2 h-4 w-4" />
            {t("forms.createForm")}
          </Button>
        </div>

        {formsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-2 h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : forms && forms.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                workspaceSlug={workspaceSlug}
                eventSlug={event.slug}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Icons.fileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="mt-4 text-sm font-medium">{t("forms.noFormsYet")}</h4>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {t("forms.noFormsDescription")}
              </p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Icons.plus className="mr-2 h-4 w-4" />
                {t("forms.createFirstForm")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        eventId={event.id}
        workspaceSlug={workspaceSlug}
        eventSlug={event.slug}
      />
    </div>
  )
}
