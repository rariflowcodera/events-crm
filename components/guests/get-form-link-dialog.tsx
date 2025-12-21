"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react"

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
import { toast } from "sonner"

import { useTokenModeForms, useGetGuestFormToken } from "@/trpc/hooks/event-forms-hooks"

interface GetFormLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  guestId: string
  guestName: string
}

export function GetFormLinkDialog({
  open,
  onOpenChange,
  eventId,
  guestId,
  guestName,
}: GetFormLinkDialogProps) {
  const t = useTranslations()
  const [selectedFormId, setSelectedFormId] = useState<string>("")
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch token-mode forms for this event
  const { data: forms, isLoading: formsLoading } = useTokenModeForms(eventId)

  // Get/create token mutation
  const { mutate: getToken, isPending: isGenerating } = useGetGuestFormToken({
    onSuccess: (data) => {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const url = `${baseUrl}/forms/t/${data.token}`
      setGeneratedUrl(url)
    },
  })

  const handleGenerate = () => {
    if (!selectedFormId) return
    getToken({
      formId: selectedFormId,
      guestId,
    })
  }

  const handleCopy = async () => {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      toast.success(t("forms.linkCopied"))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t("forms.copyFailed"))
    }
  }

  const handleOpenLink = () => {
    if (generatedUrl) {
      window.open(generatedUrl, "_blank")
    }
  }

  const handleClose = () => {
    setSelectedFormId("")
    setGeneratedUrl(null)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("forms.getFormLink")}</DialogTitle>
          <DialogDescription>
            {t("forms.getFormLinkDescription", { name: guestName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Form selector */}
          <div className="space-y-2">
            <Label>{t("forms.selectForm")}</Label>
            {formsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : forms && forms.length > 0 ? (
              <Select
                value={selectedFormId}
                onValueChange={(value) => {
                  setSelectedFormId(value)
                  setGeneratedUrl(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("forms.selectFormPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Alert>
                <AlertDescription>
                  {t("forms.noTokenForms")}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Generate button */}
          {selectedFormId && !generatedUrl && (
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
                t("forms.generateLink")
              )}
            </Button>
          )}

          {/* Generated URL */}
          {generatedUrl && (
            <div className="space-y-3">
              <Label>{t("forms.generatedLink")}</Label>
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
