"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { getPreSignedUrl, uploadFileToS3 } from "@/server/hooks/use-image-upload"
import Dropzone from "react-dropzone"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/global/icons"

// ============================================================================
// Types
// ============================================================================

interface LogoUploadGroupProps {
  logo?: string
  logoDark?: string
  onLogoChange: (url: string) => void
  onLogoDarkChange: (url: string) => void
  disabled?: boolean
  className?: string
}

// ============================================================================
// Single Logo Upload Component
// ============================================================================

interface SingleLogoUploadProps {
  value?: string
  onChange: (url: string) => void
  label: string
  helpText: string
  disabled?: boolean
  isDarkPreview?: boolean
}

function SingleLogoUpload({
  value,
  onChange,
  label,
  helpText,
  disabled,
  isDarkPreview,
}: SingleLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
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
        // For local storage, the uploadResult contains the actual imageUrl
        const imageUrl =
          storageProvider === "local" && typeof uploadResult === "string"
            ? uploadResult
            : data.data.imageUrl

        onChange(imageUrl)
        toast.success("Logo uploaded successfully")
      }
      setIsUploading(false)
    } catch (error) {
      setIsUploading(false)
      toast.error("Failed to upload logo")
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={cn(
          "rounded-lg border p-4",
          isDarkPreview ? "bg-gray-900" : "bg-white dark:bg-gray-100"
        )}
      >
        <Dropzone
          multiple={false}
          disabled={disabled}
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
                  if (!disabled) {
                    open()
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  "relative flex h-20 cursor-pointer items-center justify-center rounded-md transition-colors",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                {value ? (
                  <div className="group relative flex h-full w-full items-center justify-center">
                    <Image
                      src={value}
                      alt={label}
                      width={200}
                      height={80}
                      className="max-h-16 w-auto object-contain"
                      unoptimized={value.startsWith("/api/uploads/")}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          open()
                        }}
                      >
                        <Icons.edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                        type="button"
                        onClick={handleRemove}
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center gap-2",
                      isDarkPreview ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    {isUploading ? (
                      <Icons.loader className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Icons.upload className="h-6 w-6" />
                        <span className="text-xs">Click or drag to upload</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  {...getInputProps()}
                  className="hidden"
                  accept="image/*"
                  type="file"
                  disabled={disabled}
                  ref={fileInputRef}
                />
              </div>
            )
          }}
        </Dropzone>
      </div>
      <p className="text-xs text-muted-foreground">{helpText}</p>
    </div>
  )
}

// ============================================================================
// Logo Upload Group Component
// ============================================================================

export function LogoUploadGroup({
  logo,
  logoDark,
  onLogoChange,
  onLogoDarkChange,
  disabled,
  className,
}: LogoUploadGroupProps) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", className)}>
      <SingleLogoUpload
        value={logo}
        onChange={onLogoChange}
        label="Logo (Light Mode)"
        helpText="Displayed on light backgrounds"
        disabled={disabled}
        isDarkPreview={false}
      />
      <SingleLogoUpload
        value={logoDark}
        onChange={onLogoDarkChange}
        label="Logo (Dark Mode)"
        helpText="Displayed on dark backgrounds (optional)"
        disabled={disabled}
        isDarkPreview={true}
      />
    </div>
  )
}
