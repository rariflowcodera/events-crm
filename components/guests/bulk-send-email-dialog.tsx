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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Icons } from "@/components/global/icons"
import { useSendBulkEmail, useBulkEmailJobStatus } from "@/trpc/hooks/bulk-email-hooks"
import { useEmailTemplates, useDefaultEmailTemplates } from "@/trpc/hooks/email-hooks"
import type { EmailTemplateType } from "@/lib/schemas"

interface BulkSendEmailDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  guestIds: string[]
  emailType: EmailTemplateType
  onSuccess?: () => void
}

export function BulkSendEmailDialog({
  isOpen,
  onClose,
  eventId,
  guestIds,
  emailType,
  onSuccess,
}: BulkSendEmailDialogProps) {
  const t = useTranslations("bulkEmail")

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // Fetch templates for the email type
  const { data: templates, isLoading: loadingTemplates } = useEmailTemplates({
    eventId,
    type: emailType,
  })

  // Fetch default templates
  const { data: defaultTemplates } = useDefaultEmailTemplates(eventId)

  // Get job status with polling when active
  const { data: jobStatus } = useBulkEmailJobStatus(activeJobId, {
    refetchInterval: activeJobId ? 1000 : false,
  })

  // Send bulk email mutation
  const { mutate: sendBulk, isPending: isSending } = useSendBulkEmail({
    onSuccess: (data) => {
      setActiveJobId(data.bulkJobId)
    },
  })

  // Set default template when dialog opens
  useEffect(() => {
    if (isOpen && defaultTemplates && defaultTemplates[emailType]) {
      setSelectedTemplateId(defaultTemplates[emailType].id)
    } else if (isOpen && templates?.length) {
      setSelectedTemplateId(templates[0].id)
    }
  }, [isOpen, defaultTemplates, emailType, templates])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setActiveJobId(null)
      setSelectedTemplateId(null)
    }
  }, [isOpen])

  // Check if job is complete
  const isJobComplete = jobStatus?.status === "completed" || jobStatus?.status === "failed"

  const handleSend = () => {
    if (!selectedTemplateId) return

    sendBulk({
      eventId,
      templateId: selectedTemplateId,
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

  const templatesList = templates ?? []

  // Get human-readable email type label
  const emailTypeLabel: Record<EmailTemplateType, string> = {
    invitation: t("types.invitation"),
    reminder: t("types.reminder"),
    confirmation: t("types.confirmation"),
    declined_acknowledgment: t("types.declined"),
    update: t("types.update"),
    cancellation: t("types.cancellation"),
    custom: t("types.custom"),
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

        {/* Template Selection (only before sending) */}
        {!activeJobId && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template">{t("selectTemplate")}</Label>
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Icons.loader className="h-4 w-4 animate-spin" />
                  Loading templates...
                </div>
              ) : templatesList.length === 0 ? (
                <p className="text-destructive text-sm">
                  {t("noTemplates", { type: emailTypeLabel[emailType] })}
                </p>
              ) : (
                <Select
                  value={selectedTemplateId ?? ""}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder={t("selectTemplatePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesList.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.isDefault && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        {/* Progress Display */}
        {activeJobId && jobStatus && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              {jobStatus.status === "processing" && (
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
          {!activeJobId ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedTemplateId || isSending}
              >
                {isSending && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                {t("send")}
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
