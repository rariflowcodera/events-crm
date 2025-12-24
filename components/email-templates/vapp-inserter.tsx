"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Car } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface VappInserterProps {
  onInsert: (variable: string) => void
  onFocus?: () => void
  disabled?: boolean
}

type InsertMode = "link" | "url"

export function VappInserter({ onInsert, onFocus, disabled }: VappInserterProps) {
  const t = useTranslations("vapp")
  const tForms = useTranslations("forms")

  const [open, setOpen] = useState(false)
  const [displayText, setDisplayText] = useState("")
  const [insertMode, setInsertMode] = useState<InsertMode>("link")

  const handleInsert = () => {
    let variable: string

    if (insertMode === "url") {
      // Insert URL only: {{vappUrl}}
      variable = "{{vappUrl}}"
    } else if (displayText.trim()) {
      // Insert link with custom text: {{vapp.link|Custom Text}}
      variable = `{{vapp.link|${displayText.trim()}}}`
    } else {
      // Insert link with default text: {{vapp.link}}
      variable = "{{vapp.link}}"
    }

    onInsert(variable)
    setOpen(false)
    setDisplayText("")
    setInsertMode("link")
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setDisplayText("")
      setInsertMode("link")
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
          <Car className="mr-1.5 h-3 w-3" />
          {t("insertVapp")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-medium text-sm">{t("insertVappLink")}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t("insertVappDescription")}
            </p>
          </div>

          {/* Display text input */}
          <div className="space-y-2">
            <Label htmlFor="vappDisplayText" className="text-sm">
              {tForms("insert.displayText")}
            </Label>
            <Input
              id="vappDisplayText"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder={t("displayTextPlaceholder")}
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t("displayTextHint")}
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
                <RadioGroupItem value="link" id="vapp-link" />
                <Label htmlFor="vapp-link" className="text-sm font-normal cursor-pointer">
                  {tForms("insert.linkWithText")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="vapp-url" />
                <Label htmlFor="vapp-url" className="text-sm font-normal cursor-pointer">
                  {tForms("insert.urlOnly")}
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
