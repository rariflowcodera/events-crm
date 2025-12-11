"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"

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
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Icons } from "@/components/global/icons"
import { useSendBulkEmail, useBulkEmailJobStatus } from "@/trpc/hooks/bulk-email-hooks"
import { useEmailTemplates } from "@/trpc/hooks/email-hooks"
import type { EmailTemplateType } from "@/lib/schemas"

interface SendEmailDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  guestIds: string[]
  onSuccess?: () => void
}

export function SendEmailDialog({
  isOpen,
  onClose,
  eventId,
  guestIds,
  onSuccess,
}: SendEmailDialogProps) {
  const t = useTranslations("bulkEmail")

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // Fetch all templates for the event
  const { data: templates, isLoading: loadingTemplates } = useEmailTemplates({ eventId })

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

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplateId("")
      setActiveJobId(null)
    }
  }, [isOpen])

  // Check if job is complete
  const isJobComplete = jobStatus?.status === "completed" || jobStatus?.status === "failed"

  // Get selected template details
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || !templates) return null
    return templates.find((t) => t.id === selectedTemplateId) || null
  }, [selectedTemplateId, templates])

  // Get template type label
  const typeLabels: Record<EmailTemplateType, string> = {
    invitation: t("types.invitation"),
    reminder: t("types.reminder"),
    confirmation: t("types.confirmation"),
    declined_acknowledgment: t("types.declined"),
    update: t("types.update"),
    cancellation: t("types.cancellation"),
    custom: t("types.custom"),
  }

  const handleSend = () => {
    if (!selectedTemplate) return

    sendBulk({
      eventId,
      templateId: selectedTemplate.id,
      emailType: selectedTemplate.type as EmailTemplateType,
      guestIds,
    })
  }

  const handleClose = () => {
    if (isJobComplete) {
      onSuccess?.()
    }
    onClose()
  }

  // Get subject line preview from template content
  const getSubjectPreview = (template: NonNullable<typeof selectedTemplate>) => {
    const content = template.content as { en?: { subject?: string }; ar?: { subject?: string } }
    return content?.en?.subject || content?.ar?.subject || ""
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sendEmailTitle")}</DialogTitle>
          <DialogDescription>
            {t("sendDescription", { count: guestIds.length })}
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {loadingTemplates && !activeJobId && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Icons.loader className="h-5 w-5 animate-spin" />
            <span>{t("loadingTemplates")}</span>
          </div>
        )}

        {/* No Templates State */}
        {!loadingTemplates && !activeJobId && templates?.length === 0 && (
          <div className="py-4">
            <Alert>
              <Icons.mail className="h-4 w-4" />
              <AlertTitle>{t("noTemplatesTitle")}</AlertTitle>
              <AlertDescription>
                {t("noTemplatesDescription")}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Template Selection State */}
        {!loadingTemplates && !activeJobId && templates && templates.length > 0 && (
          <div className="space-y-4 py-4">
            {/* Template Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("selectTemplate")}</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectTemplatePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[template.type as EmailTemplateType]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Template Preview */}
            {selectedTemplate && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Icons.mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedTemplate.name}</span>
                  <Badge variant="secondary">
                    {typeLabels[selectedTemplate.type as EmailTemplateType]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t("subjectLabel")}:</span>{" "}
                  {getSubjectPreview(selectedTemplate) || t("noSubject")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Progress Display */}
        {activeJobId && jobStatus && (
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
          {!activeJobId ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  loadingTemplates ||
                  !selectedTemplateId ||
                  guestIds.length === 0 ||
                  isSending
                }
              >
                {isSending && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                {t("sendCount", { count: guestIds.length })}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} disabled={!isJobComplete}>
              {isJobComplete ? t("done") : t("pleaseWait")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
