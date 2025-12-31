"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Copy, Check, ExternalLink, Loader2, Mail } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

import { useEmailTemplates } from "@/trpc/hooks/email-hooks"
import { useGenerateEmailPreviewToken } from "@/trpc/hooks/email-preview-hooks"
import type { EmailTemplateType } from "@/lib/schemas"

// Type labels for badges
const typeLabels: Record<EmailTemplateType, string> = {
  invitation: "Invitation",
  reminder: "Reminder",
  confirmation: "Confirmation",
  declined_acknowledgment: "Declined",
  maybe_acknowledgment: "Maybe",
  update: "Update",
  cancellation: "Cancellation",
  custom: "Custom",
}

interface GenerateEmailLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  guestId: string
  guestName: string
}

export function GenerateEmailLinkDialog({
  open,
  onOpenChange,
  eventId,
  guestId,
  guestName,
}: GenerateEmailLinkDialogProps) {
  const t = useTranslations()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch email templates for this event
  const { data: templates, isLoading: templatesLoading } = useEmailTemplates({
    eventId,
  })

  // Generate token mutation
  const { mutate: generateToken, isPending: isGenerating } = useGenerateEmailPreviewToken({
    onSuccess: (data) => {
      setGeneratedUrl(data.url)
    },
  })

  const handleGenerate = () => {
    if (!selectedTemplateId) return
    generateToken({
      eventId,
      guestId,
      templateId: selectedTemplateId,
    })
  }

  const handleCopy = async () => {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      toast.success(t("emailPreview.linkCopied"))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t("emailPreview.copyFailed"))
    }
  }

  const handleOpenLink = () => {
    if (generatedUrl) {
      window.open(generatedUrl, "_blank")
    }
  }

  const handleClose = () => {
    setSelectedTemplateId("")
    setGeneratedUrl(null)
    setCopied(false)
    onOpenChange(false)
  }

  // Get subject line for preview
  const getSubjectPreview = (template: { structuredContent?: unknown; content?: unknown }) => {
    // Try structured content first
    const structured = template.structuredContent as { en?: { subject?: string } } | null
    if (structured?.en?.subject) {
      return structured.en.subject
    }
    // Fall back to legacy content
    const legacy = template.content as { en?: { subject?: string } } | null
    return legacy?.en?.subject || null
  }

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("emailPreview.generateLink")}</DialogTitle>
          <DialogDescription>
            {t("emailPreview.generateLinkDescription", { name: guestName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template selector */}
          <div className="space-y-2">
            <Label>{t("emailPreview.selectTemplate")}</Label>
            {templatesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates && templates.length > 0 ? (
              <Select
                value={selectedTemplateId}
                onValueChange={(value) => {
                  setSelectedTemplateId(value)
                  setGeneratedUrl(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("emailPreview.selectTemplatePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[template.type as EmailTemplateType] || template.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Alert>
                <AlertDescription>
                  {t("emailPreview.noTemplates")}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Template preview */}
          {selectedTemplate && !generatedUrl && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedTemplate.name}</span>
                <Badge variant="secondary">
                  {typeLabels[selectedTemplate.type as EmailTemplateType] || selectedTemplate.type}
                </Badge>
              </div>
              {getSubjectPreview(selectedTemplate) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t("emailPreview.subjectLabel")}:</span>{" "}
                  {getSubjectPreview(selectedTemplate)}
                </p>
              )}
            </div>
          )}

          {/* Generate button */}
          {selectedTemplateId && !generatedUrl && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("emailPreview.generateButton")
              )}
            </Button>
          )}

          {/* Generated URL */}
          {generatedUrl && (
            <div className="space-y-3">
              <Label>{t("emailPreview.generatedLink")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenLink}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
