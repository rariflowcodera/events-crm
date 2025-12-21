"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Check, Download, ExternalLink, QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { toast } from "sonner"

interface FormLinksPanelProps {
  form: {
    id: string
    name: string
    slug: string
    shortCode: string | null
    isPublished: boolean
    accessType: "email" | "token"
  }
  workspaceSlug: string
  eventSlug: string
}

export function FormLinksPanel({ form, workspaceSlug, eventSlug }: FormLinksPanelProps) {
  const t = useTranslations()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  // Generate URLs
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const directUrl = `${baseUrl}/f/${form.shortCode}`

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

  // Token mode - show message to generate links from guest list
  if (form.accessType === "token") {
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
          <div className="rounded-lg border border-dashed p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Icons.link className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium mb-1">{t("forms.tokenModeTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("forms.tokenModeDescription")}
            </p>
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
      </CardContent>
    </Card>
  )
}
