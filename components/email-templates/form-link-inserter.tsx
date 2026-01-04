"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { useTokenModeForms } from "@/trpc/hooks/event-forms-hooks"
import type { BilingualText } from "@/server/db/schemas/event-form"

// Helper to get localized text (default to English)
function getLocalizedText(text: BilingualText | null | undefined): string {
  if (!text) return ""
  return text.en || ""
}
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FileText } from "lucide-react"

interface FormLinkInserterProps {
  eventId: string
  onInsert: (variable: string) => void
  onFocus?: () => void
}

type InsertMode = "link" | "url"

interface SelectedForm {
  id: string
  name: string
  purpose: string | null
}

export function FormLinkInserter({ eventId, onInsert, onFocus }: FormLinkInserterProps) {
  const t = useTranslations("forms")
  const tEmail = useTranslations("emailTemplate")

  const { data: forms, isLoading } = useTokenModeForms(eventId)

  const [open, setOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<SelectedForm | null>(null)
  const [displayText, setDisplayText] = useState("")
  const [insertMode, setInsertMode] = useState<InsertMode>("link")

  const handleSelectForm = (form: SelectedForm) => {
    setSelectedForm(form)
    setDisplayText("")
    setInsertMode("link")
  }

  const handleBack = () => {
    setSelectedForm(null)
    setDisplayText("")
    setInsertMode("link")
  }

  const handleInsert = () => {
    if (!selectedForm) return

    let variable: string
    if (insertMode === "url") {
      // Insert URL only: {{formUrl.UUID}}
      variable = `{{formUrl.${selectedForm.id}}}`
    } else if (displayText.trim()) {
      // Insert link with custom text: {{formLink.UUID|Custom Text}}
      variable = `{{formLink.${selectedForm.id}|${displayText.trim()}}}`
    } else {
      // Insert link with form name: {{formLink.UUID}}
      variable = `{{formLink.${selectedForm.id}}}`
    }

    onInsert(variable)
    setOpen(false)
    setSelectedForm(null)
    setDisplayText("")
    setInsertMode("link")
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedForm(null)
      setDisplayText("")
      setInsertMode("link")
    }
  }

  const hasForms = forms && forms.length > 0

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
          <FileText className="mr-1.5 h-3 w-3" />
          {tEmail("insertFormLink")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {selectedForm ? (
          // Panel 2: Configuration options
          <div className="p-3 space-y-4">
            {/* Back button and header */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleBack}
              >
                <Icons.chevronLeft className="h-4 w-4" />
                {t("insert.back")}
              </Button>
            </div>

            {/* Selected form info */}
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{selectedForm.name}</div>
                {selectedForm.purpose && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
                    {selectedForm.purpose}
                  </Badge>
                )}
              </div>
            </div>

            {/* Display text input */}
            <div className="space-y-2">
              <Label htmlFor="displayText" className="text-sm">
                {t("insert.displayText")}
              </Label>
              <Input
                id="displayText"
                value={displayText}
                onChange={(e) => setDisplayText(e.target.value)}
                placeholder={t("insert.displayTextPlaceholder")}
                className="h-8 text-sm"
              />
            </div>

            {/* Insert mode radio group */}
            <div className="space-y-2">
              <Label className="text-sm">{t("insert.insertAs")}</Label>
              <RadioGroup
                value={insertMode}
                onValueChange={(value) => setInsertMode(value as InsertMode)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="link" id="link" />
                  <Label htmlFor="link" className="text-sm font-normal cursor-pointer">
                    {t("insert.linkWithText")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="url" />
                  <Label htmlFor="url" className="text-sm font-normal cursor-pointer">
                    {t("insert.urlOnly")}
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
              {t("insert.insert")}
            </Button>
          </div>
        ) : (
          // Panel 1: Form list
          <Command>
            <CommandInput placeholder={t("searchForms")} />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t("loadingForms")}
                </div>
              ) : !hasForms ? (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">{t("noTokenForms")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("noTokenFormsDescription")}
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup heading={t("tokenModeForms")}>
                  {forms.map((form) => (
                    <CommandItem
                      key={form.id}
                      onSelect={() => handleSelectForm({
                        id: form.id,
                        name: getLocalizedText(form.name as BilingualText),
                        purpose: form.purpose,
                      })}
                      className="flex items-start gap-2 py-2"
                    >
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {getLocalizedText(form.name as BilingualText)}
                        </div>
                        {form.purpose && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
                            {form.purpose}
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}
