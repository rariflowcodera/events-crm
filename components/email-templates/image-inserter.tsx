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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ImageInserterProps {
  eventId: string
  onInsert: (variable: string) => void
  onFocus?: () => void
}

interface SelectedImage {
  id: string
  name: string
  url: string
  fileName: string
}

export function ImageInserter({ eventId, onInsert, onFocus }: ImageInserterProps) {
  const t = useTranslations("emailTemplate")

  const { data: documents, isLoading } = useEventDocuments(eventId)

  // Filter to only image type documents
  const images = documents?.filter((doc) => doc.type === "image") ?? []

  const [open, setOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)
  const [altText, setAltText] = useState("")

  const handleSelectImage = (img: SelectedImage) => {
    setSelectedImage(img)
    setAltText("")
  }

  const handleBack = () => {
    setSelectedImage(null)
    setAltText("")
  }

  const handleInsert = () => {
    if (!selectedImage) return

    let variable: string
    if (altText.trim()) {
      // Insert with custom alt text: {{image.UUID|Alt Text}}
      variable = `{{image.${selectedImage.id}|${altText.trim()}}}`
    } else {
      // Insert with default alt (image name): {{image.UUID}}
      variable = `{{image.${selectedImage.id}}}`
    }

    onInsert(variable)
    setOpen(false)
    setSelectedImage(null)
    setAltText("")
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedImage(null)
      setAltText("")
    }
  }

  const hasImages = images.length > 0

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
          <Icons.image className="mr-1.5 h-3 w-3" />
          {t("insertImage")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {selectedImage ? (
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
                {t("back")}
              </Button>
            </div>

            {/* Selected image preview */}
            <div className="flex flex-col gap-2 p-2 rounded-md bg-muted/50">
              <div className="relative w-full h-32 rounded overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="font-medium text-sm truncate">{selectedImage.name}</div>
              <span className="text-xs text-muted-foreground truncate">
                {selectedImage.fileName}
              </span>
            </div>

            {/* Alt text input */}
            <div className="space-y-2">
              <Label htmlFor="altText" className="text-sm">
                {t("imageAltText")}
              </Label>
              <Input
                id="altText"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder={t("imageAltTextPlaceholder")}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t("imageAltTextDescription")}
              </p>
            </div>

            {/* Insert button */}
            <Button
              type="button"
              className="w-full"
              size="sm"
              onClick={handleInsert}
            >
              {t("insertImageButton")}
            </Button>
          </div>
        ) : (
          // Panel 1: Image list
          <Command>
            <CommandInput placeholder={t("searchImages")} />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t("loadingImages")}
                </div>
              ) : !hasImages ? (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <Icons.image className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">{t("noImages")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("noImagesDescription")}
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup heading={t("selectImage")}>
                  {images.map((img) => (
                    <CommandItem
                      key={img.id}
                      onSelect={() => handleSelectImage({
                        id: img.id,
                        name: img.name,
                        url: img.url,
                        fileName: img.fileName,
                      })}
                      className="flex items-start gap-2 py-2"
                    >
                      <div className="h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{img.name}</div>
                        <span className="text-xs text-muted-foreground truncate">
                          {img.fileName}
                        </span>
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
