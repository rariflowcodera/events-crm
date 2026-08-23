"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { QrCode } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface QrCodeInserterProps {
  onInsert: (variable: string) => void
  onFocus?: () => void
  disabled?: boolean
}

type InsertMode = "qrCode" | "referenceNumber"

export function QrCodeInserter({ onInsert, onFocus, disabled }: QrCodeInserterProps) {
  const t = useTranslations("reference")
  const tForms = useTranslations("forms")

  const [open, setOpen] = useState(false)
  const [insertMode, setInsertMode] = useState<InsertMode>("qrCode")

  const handleInsert = () => {
    const variable =
      insertMode === "qrCode" ? "{{guest.qrCode}}" : "{{guest.referenceNumber}}"

    onInsert(variable)
    setOpen(false)
    setInsertMode("qrCode")
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setInsertMode("qrCode")
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onFocus}
          disabled={disabled}
        >
          <QrCode className="mr-1.5 h-3 w-3" />
          {t("insertQrCode")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-medium text-sm">{t("insertQrCode")}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t("insertQrCodeDescription")}
            </p>
          </div>

          {/* Insert mode radio group */}
          <div className="space-y-2">
            <Label className="text-sm">{tForms("insert.insertAs")}</Label>
            <RadioGroup
              value={insertMode}
              onValueChange={(value) => setInsertMode(value as InsertMode)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="qrCode" id="reference-qr-code" />
                <Label htmlFor="reference-qr-code" className="text-sm font-normal cursor-pointer">
                  {t("qrCode")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="referenceNumber" id="reference-number" />
                <Label htmlFor="reference-number" className="text-sm font-normal cursor-pointer">
                  {t("title")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Insert button */}
          <Button
            type="button"
            className="w-full"
            size="sm"
            onClick={handleInsert}
          >
            {tForms("insert.insert")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
