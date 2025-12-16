"use client"

import Dropzone from "react-dropzone"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGuestImageUpload } from "@/hooks/use-guest-image-upload"
import { Icons } from "@/components/global/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface GuestProfileImageProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
  eventId: string
  disabled?: boolean
  guestName?: string
  size?: "sm" | "md" | "lg"
}

export function GuestProfileImage({
  value,
  onChange,
  eventId,
  disabled = false,
  guestName,
  size = "md",
}: GuestProfileImageProps) {
  const { uploadGuestImage, isUploading } = useGuestImageUpload()

  const sizeClasses = {
    sm: "size-10",
    md: "size-16",
    lg: "size-24",
  }

  const handleFileDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const imageUrl = await uploadGuestImage(file, eventId)
    if (imageUrl) {
      onChange(imageUrl)
    }
  }

  const initials = guestName
    ?.split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Dropzone
      multiple={false}
      disabled={disabled || isUploading}
      accept={{ "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] }}
      onDrop={handleFileDrop}
    >
      {({ getRootProps, getInputProps }) => (
        <div
          {...getRootProps()}
          className={cn(
            "relative cursor-pointer group",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
            {value ? <AvatarImage src={value} alt="Guest profile" /> : null}
            <AvatarFallback className="text-sm">
              {isUploading ? (
                <Icons.loader className="size-4 animate-spin" />
              ) : (
                initials || <Icons.user className="size-4" />
              )}
            </AvatarFallback>
          </Avatar>

          {!disabled && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="size-4 text-white" />
            </div>
          )}

          <input {...getInputProps()} />
        </div>
      )}
    </Dropzone>
  )
}
