import { useState } from "react"
import { toast } from "sonner"

const ALLOWED_TYPES = ["image/gif", "image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function useGuestImageUpload() {
  const [isUploading, setIsUploading] = useState(false)

  const uploadGuestImage = async (
    file: File,
    eventId: string
  ): Promise<string | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        "Invalid file type. Please select an image file (PNG, JPEG, GIF, WebP)."
      )
      return null
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds the maximum limit of 10MB")
      return null
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("eventId", eventId)

      const res = await fetch("/api/guest-image-upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || "Upload failed")
      }

      const json = await res.json()
      toast.success("Image uploaded successfully")
      return json.data?.imageUrl || null
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload image"
      toast.error(message)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadGuestImage, isUploading }
}
