"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { getPreSignedUrl, uploadFileToS3 } from "@/server/hooks/use-image-upload"
import Dropzone from "react-dropzone"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/components/global/icons"

// ============================================================================
// Types
// ============================================================================

type BackgroundImageMode = "cover" | "contain" | "repeat" | "center"

interface BackgroundImageUploadProps {
  value?: string
  onChange: (url: string) => void
  mode?: BackgroundImageMode
  onModeChange?: (mode: BackgroundImageMode) => void
  disabled?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/** Helper to get CSS background styles based on mode */
function getBackgroundStyles(mode: BackgroundImageMode = "cover") {
  switch (mode) {
    case "cover":
      return { backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    case "contain":
      return { backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    case "repeat":
      return { backgroundSize: "auto", backgroundPosition: "top left", backgroundRepeat: "repeat" }
    case "center":
      return { backgroundSize: "auto", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    default:
      return { backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
  }
}

export { getBackgroundStyles, type BackgroundImageMode }

export function BackgroundImageUpload({
  value,
  onChange,
  mode = "cover",
  onModeChange,
  disabled,
  className,
}: BackgroundImageUploadProps) {
  const t = useTranslations("branding")
  const [isUploading, setIsUploading] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = async (file: File) => {
    try {
      setIsUploading(true)
      const data = await getPreSignedUrl(file)

      if (!data || !data.data) {
        setIsUploading(false)
        return toast.error("Too many requests. Please try again later.")
      }

      const storageProvider = data.data.storageProvider || "s3"
      const uploadUrl =
        storageProvider === "local" ? data.data.uploadUrl : data.data.preSignedUrl

      if (!uploadUrl) {
        setIsUploading(false)
        return toast.error("Failed to get upload URL")
      }

      const uploadResult = await uploadFileToS3(uploadUrl, file, storageProvider)
      if (uploadResult) {
        const imageUrl =
          storageProvider === "local" && typeof uploadResult === "string"
            ? uploadResult
            : data.data.imageUrl

        onChange(imageUrl)
        toast.success("Background image uploaded successfully")
      }
      setIsUploading(false)
    } catch (error) {
      setIsUploading(false)
      toast.error("Failed to upload background image")
    }
  }

  const handleUrlSubmit = () => {
    const trimmedUrl = urlInput.trim()
    if (!trimmedUrl) return

    // Validate URL format
    if (!trimmedUrl.startsWith("https://")) {
      toast.error("URL must start with https://")
      return
    }

    onChange(trimmedUrl)
    setUrlInput("")
    toast.success("Background image URL set")
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setUrlInput("")
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Label>{t("backgroundImage")}</Label>

      {/* If value exists, show preview with remove option */}
      {value ? (
        <div className="space-y-3">
          {/* Preview */}
          <div
            className="relative h-32 w-full overflow-hidden rounded-lg border"
            style={{
              backgroundImage: `url(${value})`,
              ...getBackgroundStyles(mode),
            }}
          >
            {/* Overlay with RSVP card mockup */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-32 rounded-lg bg-white/90 shadow-lg dark:bg-gray-900/90" />
            </div>

            {/* Action buttons */}
            <div className="absolute right-2 top-2 flex gap-1">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                type="button"
                onClick={handleRemove}
                disabled={disabled}
              >
                <Icons.trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Display mode dropdown */}
          {onModeChange && (
            <div className="space-y-1.5">
              <Label className="text-sm">{t("backgroundMode")}</Label>
              <Select
                value={mode}
                onValueChange={(v) => onModeChange(v as BackgroundImageMode)}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">{t("backgroundModeCover")}</SelectItem>
                  <SelectItem value="contain">{t("backgroundModeContain")}</SelectItem>
                  <SelectItem value="repeat">{t("backgroundModeRepeat")}</SelectItem>
                  <SelectItem value="center">{t("backgroundModeCenter")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-xs text-muted-foreground truncate">
            {value}
          </p>
        </div>
      ) : (
        /* No value - show upload/URL tabs */
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "url")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" disabled={disabled}>
              <Icons.upload className="mr-2 h-4 w-4" />
              {t("uploadImage")}
            </TabsTrigger>
            <TabsTrigger value="url" disabled={disabled}>
              <Icons.link className="mr-2 h-4 w-4" />
              {t("enterUrl")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-3">
            <Dropzone
              multiple={false}
              disabled={disabled || isUploading}
              noClick={false}
              noKeyboard={false}
              onDrop={async (acceptedFiles: File[]) => {
                const file = acceptedFiles[0]
                const validImageTypes = ["image/gif", "image/jpeg", "image/png", "image/webp"]

                if (file && validImageTypes.includes(file.type)) {
                  handleFileDrop(file)
                } else {
                  toast.error("Invalid file type. Please select an image file.")
                }
              }}
            >
              {({ getRootProps, getInputProps, open }) => {
                const rootProps = getRootProps()
                return (
                  <div
                    {...rootProps}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!disabled && !isUploading) {
                        open()
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors",
                      "hover:border-primary/50 hover:bg-muted/50",
                      (disabled || isUploading) && "cursor-not-allowed opacity-60"
                    )}
                  >
                    {isUploading ? (
                      <Icons.loader className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Icons.upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Click or drag to upload a pattern or background image
                        </span>
                      </>
                    )}
                    <input
                      {...getInputProps()}
                      className="hidden"
                      accept="image/*"
                      type="file"
                      disabled={disabled || isUploading}
                      ref={fileInputRef}
                    />
                  </div>
                )
              }}
            </Dropzone>
          </TabsContent>

          <TabsContent value="url" className="mt-3">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder={t("pasteImageUrl")}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleUrlSubmit()
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleUrlSubmit}
                disabled={disabled || !urlInput.trim()}
              >
                {t("apply") || "Apply"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("backgroundImageHelp")}
            </p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
