"use client"

import { useState } from "react"
import Image from "next/image"
import Dropzone from "react-dropzone"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { getPreSignedUrl, uploadFileToS3 } from "@/server/hooks/use-image-upload"
import { useUpdateEvent } from "@/trpc/hooks/events-hooks"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/global/icons"

interface EventCoverImageUploadProps {
  eventId: string
  value: string | null
  disabled?: boolean
}

export function EventCoverImageUpload({
  eventId,
  value,
  disabled,
}: EventCoverImageUploadProps) {
  const t = useTranslations("event.settings")
  const [isUploading, setIsUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const { mutate: updateEvent } = useUpdateEvent()

  const handleFileDrop = async (file: File) => {
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)

    try {
      setIsUploading(true)
      const data = await getPreSignedUrl(file)

      if (!data || !data.data) {
        setIsUploading(false)
        setLocalPreview(null)
        URL.revokeObjectURL(objectUrl)
        return toast.error("Too many requests. Please try again later.")
      }

      const storageProvider = data.data.storageProvider || "s3"
      const uploadUrl =
        storageProvider === "local" ? data.data.uploadUrl : data.data.preSignedUrl

      if (!uploadUrl) {
        setIsUploading(false)
        setLocalPreview(null)
        URL.revokeObjectURL(objectUrl)
        return toast.error("Failed to get upload URL")
      }

      const uploadResult = await uploadFileToS3(uploadUrl, file, storageProvider)
      if (uploadResult) {
        const imageUrl =
          storageProvider === "local" && typeof uploadResult === "string"
            ? uploadResult
            : data.data.imageUrl

        updateEvent({ eventId, coverImage: imageUrl })
      }
      setIsUploading(false)
      URL.revokeObjectURL(objectUrl)
      setLocalPreview(null)
    } catch {
      setIsUploading(false)
      setLocalPreview(null)
      URL.revokeObjectURL(objectUrl)
      toast.error("Failed to upload cover image")
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateEvent({ eventId, coverImage: null })
  }

  const displayValue = localPreview || value

  return (
    <div className="space-y-3">
      <Label>{t("coverImage")}</Label>

      {displayValue ? (
        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border">
          <Image src={displayValue} alt="" fill className="object-cover" unoptimized={!!localPreview} />
          {isUploading ? (
            <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
              <Icons.loader className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="absolute top-2 right-2 flex gap-1">
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
          )}
        </div>
      ) : (
        <Dropzone
          multiple={false}
          disabled={disabled || isUploading}
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
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className={cn(
                "flex aspect-video w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors",
                "hover:border-primary/50 hover:bg-muted/50",
                (disabled || isUploading) && "cursor-not-allowed opacity-60"
              )}
            >
              {isUploading ? (
                <Icons.loader className="text-muted-foreground h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Icons.upload className="text-muted-foreground h-6 w-6" />
                  <span className="text-muted-foreground text-xs">
                    {t("coverImageUploadPrompt")}
                  </span>
                </>
              )}
              <input
                {...getInputProps()}
                className="hidden"
                accept="image/*"
                type="file"
                disabled={disabled || isUploading}
              />
            </div>
          )}
        </Dropzone>
      )}
    </div>
  )
}
