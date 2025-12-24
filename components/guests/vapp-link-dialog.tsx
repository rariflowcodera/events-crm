"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Copy, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface VappLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guestName: string
  serialNumber: string | null
  vappLink: string
}

export function VappLinkDialog({
  open,
  onOpenChange,
  guestName,
  serialNumber,
  vappLink,
}: VappLinkDialogProps) {
  const t = useTranslations("guest")
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(vappLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const handleOpen = () => {
    window.open(vappLink, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>VAPP Link for {guestName}</DialogTitle>
          <DialogDescription>
            Vehicle Access Parking Permit voucher link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {serialNumber && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Serial Number</p>
              <p className="font-mono text-lg font-bold">{serialNumber}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={vappLink}
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button onClick={handleOpen} className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Tab
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
