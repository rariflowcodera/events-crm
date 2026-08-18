"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/global/icons"
import { useSendBulkByCategory, useBulkEmailJobStatus } from "@/trpc/hooks/bulk-email-hooks"
import { useGuestCategories } from "@/trpc/hooks/guest-categories-hooks"
import type { EmailTemplateType } from "@/lib/schemas"

interface BulkSendEmailDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  guestIds: string[]
  emailType: EmailTemplateType
  workspaceSlug?: string
  onSuccess?: () => void
  eventStatus?: string
}

export function BulkSendEmailDialog({
  isOpen,
  onClose,
  eventId,
  guestIds,
  emailType,
  workspaceSlug,
  onSuccess,
  eventStatus,
}: BulkSendEmailDialogProps) {
  const t = useTranslations("bulkEmail")
  const guestActionsT = useTranslations("guestActions")
  const isDraftInvitationBlocked = emailType === "invitation" && eventStatus === "draft"

  const [activeJobIds, setActiveJobIds] = useState<string[]>([])

  // Fetch ALL event categories to check if they have templates configured
  const {
    data: categories,
    isLoading: loadingCategories,
  } = useGuestCategories(eventId)

  // Track the first job for progress display (or aggregate multiple)
  const firstJobId = activeJobIds[0] ?? null

  // Get job status with polling when active
  const { data: jobStatus } = useBulkEmailJobStatus(firstJobId, {
    refetchInterval: firstJobId ? 1000 : false,
  })

  // Send bulk email by category mutation
  const { mutate: sendBulkByCategory, isPending: isSending } = useSendBulkByCategory({
    onSuccess: (data) => {
      setActiveJobIds(data.jobs.map((j) => j.bulkJobId))
    },
  })

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setActiveJobIds([])
    }
  }, [isOpen])

  // Check if all jobs are complete
  const isJobComplete = jobStatus?.status === "completed" || jobStatus?.status === "failed"

  // Check ALL categories have templates configured (simpler upfront check)
  const categoriesWithoutTemplate = categories?.filter(c => !c.defaultEmailTemplateId) ?? []
  const allHaveTemplates = categories ? categoriesWithoutTemplate.length === 0 : false

  // For now, use the selected guest count directly
  // The actual email filtering happens on the backend
  const guestsToSend = guestIds.length

  const handleSend = () => {
    sendBulkByCategory({
      eventId,
      emailType,
      guestIds,
    })
  }

  const handleClose = () => {
    if (isJobComplete) {
      onSuccess?.()
    }
    onClose()
  }

  // Get human-readable email type label
  const emailTypeLabel: Record<EmailTemplateType, string> = {
    invitation: t("types.invitation"),
    reminder: t("types.reminder"),
    confirmation: t("types.confirmation"),
    declined_acknowledgment: t("types.declined"),
    maybe_acknowledgment: t("types.maybe_acknowledgment"),
    update: t("types.update"),
    cancellation: t("types.cancellation"),
    custom: t("types.custom"),
  }

  // Get contrasting text color for category badge
  const getContrastColor = (hexColor: string | null) => {
    if (!hexColor) return "#ffffff"
    const hex = hexColor.replace("#", "")
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#ffffff"
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sendTitle", { type: emailTypeLabel[emailType] })}</DialogTitle>
          <DialogDescription>
            {t("sendDescription", { count: guestIds.length })}
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {loadingCategories && !activeJobIds.length && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Icons.loader className="h-5 w-5 animate-spin" />
            <span>{t("loading")}</span>
          </div>
        )}

        {/* Draft Event Blocked State */}
        {isDraftInvitationBlocked && !activeJobIds.length && (
          <Alert variant="destructive" className="my-4">
            <Icons.alertTriangle className="h-4 w-4" />
            <AlertDescription>
              {guestActionsT("draftEventCannotSendInvitation")}
            </AlertDescription>
          </Alert>
        )}

        {/* Missing Templates Error State */}
        {!isDraftInvitationBlocked && !loadingCategories && !activeJobIds.length && categoriesWithoutTemplate.length > 0 && (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <Icons.alertTriangle className="h-4 w-4" />
              <AlertTitle>{t("missingTemplates")}</AlertTitle>
              <AlertDescription>
                {t("missingTemplatesDescription")}
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-2">
              {categoriesWithoutTemplate.map((category) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  style={{
                    backgroundColor: category.color || "#6366f1",
                    color: getContrastColor(category.color),
                  }}
                >
                  {category.code}
                </Badge>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              {t("configureCategories")}
            </p>
          </div>
        )}

        {/* Ready to Send State */}
        {!isDraftInvitationBlocked && !loadingCategories && !activeJobIds.length && allHaveTemplates && guestsToSend > 0 && (
          <div className="py-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icons.mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t("readyToSend")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("guestsWillReceive", { count: guestsToSend })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {activeJobIds.length > 0 && jobStatus && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              {(jobStatus.status === "pending" || jobStatus.status === "processing") && (
                <Icons.loader className="h-5 w-5 animate-spin text-primary" />
              )}
              {jobStatus.status === "completed" && (
                <Icons.check className="h-5 w-5 text-green-500" />
              )}
              {jobStatus.status === "failed" && (
                <Icons.alertTriangle className="h-5 w-5 text-destructive" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {jobStatus.status === "pending" && t("status.pending")}
                  {jobStatus.status === "processing" && t("status.processing")}
                  {jobStatus.status === "completed" && t("status.completed")}
                  {jobStatus.status === "failed" && t("status.failed")}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t("progress", {
                    sent: jobStatus.sentCount,
                    total: jobStatus.totalEmails,
                  })}
                  {jobStatus.failedCount > 0 && (
                    <span className="text-destructive ml-2">
                      ({jobStatus.failedCount} failed)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Progress value={jobStatus.progress} className="h-2" />
            {jobStatus.errorMessage && (
              <p className="text-destructive text-sm">{jobStatus.errorMessage}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {activeJobIds.length === 0 ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  isDraftInvitationBlocked ||
                  loadingCategories ||
                  !allHaveTemplates ||
                  guestsToSend === 0 ||
                  isSending
                }
              >
                {isSending && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                {t("sendCount", { count: guestsToSend })}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleClose}
              disabled={!isJobComplete}
            >
              {isJobComplete ? t("done") : t("pleaseWait")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
