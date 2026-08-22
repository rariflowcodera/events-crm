"use client"

import { useMemo, useState } from "react"

import { useGuestCategories } from "@/trpc/hooks/guest-categories-hooks"
import { useAddGuestToEvent } from "@/trpc/hooks/guests-hooks"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface Participation {
  guestId: string
  eventId: string
}

interface DirectoryEntry {
  key: string
  firstName: string
  lastName: string | null
  participations: Participation[]
}

interface WorkspaceEvent {
  id: string
  name: string
  slug: string
}

interface AddGuestToEventModalProps {
  isOpen: boolean
  onClose: () => void
  entry: DirectoryEntry
  workspaceEvents: WorkspaceEvent[]
}

export function AddGuestToEventModal({
  isOpen,
  onClose,
  entry,
  workspaceEvents,
}: AddGuestToEventModalProps) {
  const [targetEventId, setTargetEventId] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")

  const alreadyInEventIds = useMemo(
    () => new Set(entry.participations.map((p) => p.eventId)),
    [entry.participations]
  )

  const availableEvents = useMemo(
    () => workspaceEvents.filter((event) => !alreadyInEventIds.has(event.id)),
    [workspaceEvents, alreadyInEventIds]
  )

  const { data: categories, isLoading: isLoadingCategories } = useGuestCategories(targetEventId)

  const { mutate, isPending } = useAddGuestToEvent({
    onSuccess: () => {
      handleClose()
    },
  })

  const handleClose = () => {
    setTargetEventId("")
    setCategoryId("")
    onClose()
  }

  const handleEventChange = (value: string) => {
    setTargetEventId(value)
    setCategoryId("")
  }

  const handleSubmit = () => {
    if (!targetEventId || !categoryId) return
    const sourceGuestId = entry.participations[0]?.guestId
    if (!sourceGuestId) return

    mutate({
      sourceGuestId,
      targetEventId,
      categoryId,
    })
  }

  const fullName = [entry.firstName, entry.lastName].filter(Boolean).join(" ")

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {fullName || "guest"} to an event</DialogTitle>
          <DialogDescription>
            Copies this guest&apos;s contact details into a new event as a fresh guest record.
            They will get a new RSVP link for that event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Target event</Label>
            <Select value={targetEventId} onValueChange={handleEventChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {availableEvents.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Already added to every event
                  </div>
                ) : (
                  availableEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={!targetEventId || isLoadingCategories}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={targetEventId ? "Select a category" : "Select an event first"}
                />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!targetEventId || !categoryId || isPending}>
            {isPending ? "Adding..." : "Add to Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
