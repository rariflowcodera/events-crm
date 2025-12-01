"use client"

import { useTranslations } from "next-intl"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AddGuestForm } from "@/components/guests/add-guest-form"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface AddGuestModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  categories: GuestCategory[]
}

export function AddGuestModal({ isOpen, onClose, eventId, categories }: AddGuestModalProps) {
  const t = useTranslations("guest")

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("add")}</SheetTitle>
          <SheetDescription>
            Add a new guest to this event. They will receive an RSVP link.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4">
          <AddGuestForm
            eventId={eventId}
            categories={categories}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
