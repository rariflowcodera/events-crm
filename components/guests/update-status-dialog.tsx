"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { useBulkUpdateGuestStatus } from "@/trpc/hooks/guests-hooks"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/components/global/icons"
import type { GuestStatus } from "@/lib/guest-status"

const STATUS_OPTIONS: { value: GuestStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "invited", label: "Invited" },
  { value: "reminded", label: "Reminded" },
  { value: "viewed", label: "Viewed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined", label: "Declined" },
  { value: "maybe", label: "Maybe" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No Show" },
]

interface UpdateStatusDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  guestIds: string[]
  onSuccess?: () => void
}

export function UpdateStatusDialog({
  isOpen,
  onClose,
  eventId,
  guestIds,
  onSuccess,
}: UpdateStatusDialogProps) {
  const t = useTranslations("guestActions")
  const [selectedStatus, setSelectedStatus] = useState<GuestStatus | "">("")

  const { mutate: updateStatus, isPending } = useBulkUpdateGuestStatus({
    onSuccess: () => {
      onClose()
      setSelectedStatus("")
      onSuccess?.()
    },
  })

  const handleUpdate = () => {
    if (!selectedStatus) return
    updateStatus({
      eventId,
      guestIds,
      status: selectedStatus,
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setSelectedStatus("")
    }
  }

  const guestCount = guestIds.length

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("updateStatus")}</DialogTitle>
          <DialogDescription>
            {t("updateStatusDescription", { count: guestCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as GuestStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectNewStatus")} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!selectedStatus || isPending}
          >
            {isPending ? (
              <>
                <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                {t("updating")}
              </>
            ) : (
              t("update")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
