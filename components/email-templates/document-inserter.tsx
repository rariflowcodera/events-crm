"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { useEventDocuments } from "@/trpc/hooks/document-hooks"
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

interface DocumentInserterProps {
  eventId: string
  onInsert: (variable: string) => void
  onFocus?: () => void
}

type InsertMode = "link" | "url"

interface SelectedDocument {
  id: string
  name: string
  type: string
  fileName: string
}

export function DocumentInserter({ eventId, onInsert, onFocus }: DocumentInserterProps) {
  const t = useTranslations("documents")
  const tEmail = useTranslations("emailTemplate")

  const { data: documents, isLoading } = useEventDocuments(eventId)

  const [open, setOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<SelectedDocument | null>(null)
  const [displayText, setDisplayText] = useState("")
  const [insertMode, setInsertMode] = useState<InsertMode>("link")

  const handleSelectDocument = (doc: SelectedDocument) => {
    setSelectedDoc(doc)
    setDisplayText("")
    setInsertMode("link")
  }

  const handleBack = () => {
    setSelectedDoc(null)
    setDisplayText("")
    setInsertMode("link")
  }

  const handleInsert = () => {
    if (!selectedDoc) return

    let variable: string
    if (insertMode === "url") {
      // Insert URL only: {{documentUrl.UUID}}
      variable = `{{documentUrl.${selectedDoc.id}}}`
    } else if (displayText.trim()) {
      // Insert link with custom text: {{document.UUID|Custom Text}}
      variable = `{{document.${selectedDoc.id}|${displayText.trim()}}}`
    } else {
      // Insert link with document name: {{document.UUID}}
      variable = `{{document.${selectedDoc.id}}}`
    }

    onInsert(variable)
    setOpen(false)
    setSelectedDoc(null)
    setDisplayText("")
    setInsertMode("link")
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedDoc(null)
      setDisplayText("")
      setInsertMode("link")
    }
  }

  const hasDocuments = documents && documents.length > 0

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
          <Icons.fileText className="mr-1.5 h-3 w-3" />
          {tEmail("insertDocument")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {selectedDoc ? (
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

            {/* Selected document info */}
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <Icons.fileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{selectedDoc.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {t(`types.${selectedDoc.type}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">
                    {selectedDoc.fileName}
                  </span>
                </div>
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
          // Panel 1: Document list
          <Command>
            <CommandInput placeholder={t("searchDocuments")} />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading documents...
                </div>
              ) : !hasDocuments ? (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <Icons.fileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("noDocumentsDescription")}
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup heading={t("title")}>
                  {documents.map((doc) => (
                    <CommandItem
                      key={doc.id}
                      onSelect={() => handleSelectDocument({
                        id: doc.id,
                        name: doc.name,
                        type: doc.type,
                        fileName: doc.fileName,
                      })}
                      className="flex items-start gap-2 py-2"
                    >
                      <Icons.fileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{doc.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t(`types.${doc.type}`)}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {doc.fileName}
                          </span>
                        </div>
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
