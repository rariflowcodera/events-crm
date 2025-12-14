"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Check, RefreshCw, Download, ExternalLink, QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Icons } from "@/components/global/icons"
import { useRegenerateShortCode } from "@/trpc/hooks/event-forms-hooks"
import { toast } from "sonner"

interface FormLinksPanelProps {
  form: {
    id: string
    name: string
    slug: string
    shortCode: string | null
    isPublished: boolean
  }
  workspaceSlug: string
  eventSlug: string
}

export function FormLinksPanel({ form, workspaceSlug, eventSlug }: FormLinksPanelProps) {
  const t = useTranslations()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const { mutate: regenerateShortCode, isPending: isRegenerating } = useRegenerateShortCode()

  // Generate URLs
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const directUrl = `${baseUrl}/f/${form.shortCode}`
  const fullUrl = `${baseUrl}/${workspaceSlug}/events/${eventSlug}/forms/${form.slug}/submit`

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success(t("forms.linkCopied"))
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error(t("forms.copyFailed"))
    }
  }

  const handleRegenerateCode = () => {
    regenerateShortCode({ formId: form.id })
  }

  const handleDownloadQR = () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector("svg")
    if (!svg) return

    // Create canvas from SVG
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx?.scale(2, 2)
      ctx?.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      // Download
      const pngUrl = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.href = pngUrl
      downloadLink.download = `${form.slug}-qr-code.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }
    img.src = url
  }

  if (!form.isPublished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t("forms.linksAndQr")}
          </CardTitle>
          <CardDescription>{t("forms.linksDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <Icons.info className="h-4 w-4" />
            {t("forms.publishToGetLinks")}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {t("forms.linksAndQr")}
        </CardTitle>
        <CardDescription>{t("forms.linksDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Short Link */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("forms.shortLink")}</Label>
            <Badge variant="secondary" className="text-xs">
              {t("forms.recommended")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{t("forms.shortLinkDescription")}</p>
          <div className="flex items-center gap-2">
            <Input value={directUrl} readOnly className="font-mono text-sm" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(directUrl, "short")}
                  >
                    {copiedField === "short" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("forms.copyLink")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(directUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("forms.openInNewTab")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Short Code */}
        <div className="space-y-2">
          <Label>{t("forms.shortCode")}</Label>
          <p className="text-xs text-muted-foreground">{t("forms.shortCodeDescription")}</p>
          <div className="flex items-center gap-2">
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-mono text-lg tracking-widest">
              {form.shortCode}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(form.shortCode || "", "code")}
                  >
                    {copiedField === "code" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("forms.copyCode")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRegenerateCode}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("forms.regenerateCode")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator />

        {/* QR Code */}
        <div className="space-y-2">
          <Label>{t("forms.qrCode")}</Label>
          <p className="text-xs text-muted-foreground">{t("forms.qrCodeDescription")}</p>
          <div className="flex items-start gap-4">
            <div
              ref={qrRef}
              className="flex items-center justify-center rounded-lg border bg-white p-3"
            >
              <QRCodeSVG
                value={directUrl}
                size={120}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <QrCode className="h-4 w-4 mr-2" />
                    {t("forms.viewLarger")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("forms.qrCodeFor", { name: form.name })}</DialogTitle>
                    <DialogDescription>{directUrl}</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="rounded-lg border bg-white p-4">
                      <QRCodeSVG
                        value={directUrl}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <Button onClick={handleDownloadQR}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("forms.downloadQr")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                <Download className="h-4 w-4 mr-2" />
                {t("forms.downloadQr")}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Full URL (for reference) */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">{t("forms.fullUrl")}</Label>
          <p className="text-xs text-muted-foreground">{t("forms.fullUrlDescription")}</p>
          <div className="flex items-center gap-2">
            <Input
              value={fullUrl}
              readOnly
              className="font-mono text-xs text-muted-foreground"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(fullUrl, "full")}
                  >
                    {copiedField === "full" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("forms.copyLink")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
