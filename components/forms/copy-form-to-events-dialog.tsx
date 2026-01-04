"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { Loader2, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEvents } from "@/trpc/hooks/events-hooks"
import { useCopyFormToEvents } from "@/trpc/hooks/event-forms-hooks"
import type { BilingualText } from "@/server/db/schemas/event-form"

// Helper to get localized text (default to English)
function getLocalizedText(text: BilingualText | null | undefined): string {
  if (!text) return ""
  return text.en || text.ar || ""
}

interface CopyFormToEventsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: {
    id: string
    name: BilingualText
    eventId: string
  }
  workspaceSlug: string
}

export function CopyFormToEventsDialog({
  open,
  onOpenChange,
  form,
  workspaceSlug,
}: CopyFormToEventsDialogProps) {
  const t = useTranslations()

  // Get all events in the workspace
  const { data: events, isLoading: eventsLoading } = useEvents(workspaceSlug)

  // Filter out the current event
  const otherEvents = useMemo(() => {
    return events?.filter((e) => e.id !== form.eventId) ?? []
  }, [events, form.eventId])

  // Selected event IDs
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedEventIds([])
    }
  }, [open])

  // Copy mutation
  const { mutate: copyForm, isPending } = useCopyFormToEvents({
    onSuccess: () => {
      onOpenChange(false)
    },
  })

  // Toggle single event selection
  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    )
  }

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedEventIds.length === otherEvents.length) {
      setSelectedEventIds([])
    } else {
      setSelectedEventIds(otherEvents.map((e) => e.id))
    }
  }

  const isAllSelected =
    selectedEventIds.length === otherEvents.length && otherEvents.length > 0

  // Handle submit
  const handleSubmit = () => {
    if (selectedEventIds.length === 0) return

    copyForm({
      formId: form.id,
      targetEventIds: selectedEventIds,
    })
  }

  const formName = getLocalizedText(form.name) || t("forms.untitled")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("forms.copyToEventsDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("forms.copyToEventsDialog.description", { name: formName })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : otherEvents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("forms.copyToEventsDialog.noOtherEvents")}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All Option */}
              <div className="flex items-center space-x-3 border-b pb-2">
                <Checkbox
                  id="select-all"
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={isPending}
                />
                <Label
                  htmlFor="select-all"
                  className="cursor-pointer text-sm font-medium"
                >
                  {t("forms.copyToEventsDialog.selectAll")}
                </Label>
                <span className="text-xs text-muted-foreground">
                  ({otherEvents.length} {t("forms.copyToEventsDialog.events")})
                </span>
              </div>

              {/* Event List */}
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-3">
                  {otherEvents.map((event) => (
                    <div key={event.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`event-${event.id}`}
                        checked={selectedEventIds.includes(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                        disabled={isPending}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <Label
                          htmlFor={`event-${event.id}`}
                          className="cursor-pointer text-sm font-medium"
                        >
                          {event.name}
                        </Label>
                        {event.startDate && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.startDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Info message about category remapping */}
              <Alert variant="default" className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t("forms.copyToEventsDialog.categoryInfo")}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedEventIds.length === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("forms.copyToEventsDialog.copying")}
              </>
            ) : (
              t("forms.copyToEventsDialog.submit", {
                count: selectedEventIds.length,
              })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
