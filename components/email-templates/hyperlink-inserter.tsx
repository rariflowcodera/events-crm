"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface HyperlinkInserterProps {
  onInsert: (variable: string) => void
  onFocus?: () => void
}

type InsertMode = "link" | "url"

export function HyperlinkInserter({ onInsert, onFocus }: HyperlinkInserterProps) {
  const t = useTranslations("hyperlink")
  const tForms = useTranslations("forms")

  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [displayText, setDisplayText] = useState("")
  const [insertMode, setInsertMode] = useState<InsertMode>("link")
  const [urlError, setUrlError] = useState("")

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError(t("urlRequired"))
      return false
    }
    // Basic URL validation - allow http, https, mailto, tel
    const urlPattern = /^(https?:\/\/|mailto:|tel:).+/i
    if (!urlPattern.test(value.trim())) {
      setUrlError(t("urlInvalid"))
      return false
    }
    setUrlError("")
    return true
  }

  const handleInsert = () => {
    if (!validateUrl(url)) return

    const trimmedUrl = url.trim()
    let variable: string

    if (insertMode === "url") {
      // Insert URL only: {{hyperlinkUrl|URL}}
      variable = `{{hyperlinkUrl|${trimmedUrl}}}`
    } else if (displayText.trim()) {
      // Insert link with custom text: {{hyperlink|URL|Custom Text}}
      variable = `{{hyperlink|${trimmedUrl}|${displayText.trim()}}}`
    } else {
      // Insert link with URL as display text: {{hyperlink|URL}}
      variable = `{{hyperlink|${trimmedUrl}}}`
    }

    onInsert(variable)
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setUrl("")
    setDisplayText("")
    setInsertMode("link")
    setUrlError("")
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resetForm()
    }
  }

  const handleUrlChange = (value: string) => {
    setUrl(value)
    if (urlError) {
      setUrlError("")
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
        >
          <Link className="mr-1.5 h-3 w-3" />
          {t("insertLink")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-medium text-sm">{t("insertHyperlink")}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t("insertLinkDescription")}
            </p>
          </div>

          {/* URL input */}
          <div className="space-y-2">
            <Label htmlFor="hyperlinkUrl" className="text-sm">
              {t("urlLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hyperlinkUrl"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={t("urlPlaceholder")}
              className={`h-8 text-sm ${urlError ? "border-destructive" : ""}`}
            />
            {urlError && (
              <p className="text-xs text-destructive">{urlError}</p>
            )}
          </div>

          {/* Display text input */}
          <div className="space-y-2">
            <Label htmlFor="hyperlinkDisplayText" className="text-sm">
              {tForms("insert.displayText")}
            </Label>
            <Input
              id="hyperlinkDisplayText"
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
                <RadioGroupItem value="link" id="hyperlink-link" />
                <Label htmlFor="hyperlink-link" className="text-sm font-normal cursor-pointer">
                  {tForms("insert.linkWithText")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="hyperlink-url" />
                <Label htmlFor="hyperlink-url" className="text-sm font-normal cursor-pointer">
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
