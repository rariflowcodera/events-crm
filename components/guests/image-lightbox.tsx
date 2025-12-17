"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ImageLightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc?: string
  guestName?: string
}

export function ImageLightbox({
  open,
  onOpenChange,
  imageSrc,
  guestName,
}: ImageLightboxProps) {
  if (!imageSrc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{guestName}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-4">
          <img
            src={imageSrc}
            alt={guestName || "Guest photo"}
            className="max-h-[70vh] max-w-full object-contain rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
