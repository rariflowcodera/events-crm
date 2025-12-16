"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import Dropzone from "react-dropzone"
import { toast } from "sonner"

import { useDocumentUpload } from "@/hooks/use-document-upload"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Icons } from "@/components/global/icons"
import { cn } from "@/lib/utils"
import type { EventDocumentType } from "@/server/db/schemas/event-document"

const ALLOWED_TYPES = [
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface GuestCategory {
  id: string
  name: string
  color: string | null
}

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  categories: GuestCategory[]
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  eventId,
  categories,
}: DocumentUploadDialogProps) {
  const t = useTranslations("documents")
  const tCommon = useTranslations("common")

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [type, setType] = useState<EventDocumentType>("other")
  const [categoryIds, setCategoryIds] = useState<string[]>([])

  const { upload, isUploading, progress } = useDocumentUpload(eventId)

  const handleFileDrop = useCallback((acceptedFiles: File[]) => {
    const droppedFile = acceptedFiles[0]
    if (!droppedFile) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(droppedFile.type)) {
      toast.error(t("errors.invalidType"))
      return
    }

    // Validate file size
    if (droppedFile.size > MAX_FILE_SIZE) {
      toast.error(t("errors.fileTooLarge"))
      return
    }

    setFile(droppedFile)
    // Set default name from filename (without extension)
    const baseName = droppedFile.name.replace(/\.[^/.]+$/, "")
    setName(baseName)
  }, [t])

  const handleUpload = async () => {
    if (!file || !name.trim()) return

    try {
      await upload(file, {
        name: name.trim(),
        type,
        categoryIds: categoryIds.length > 0 ? categoryIds : null,
      })
      handleClose()
    } catch (error: any) {
      toast.error(error.message || t("errors.uploadFailed"))
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setFile(null)
      setName("")
      setType("other")
      setCategoryIds([])
      onOpenChange(false)
    }
  }

  const isPdf = file?.type === "application/pdf"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("upload.title")}</DialogTitle>
          <DialogDescription>
            {t("upload.allowedTypes")} - {t("upload.maxSize")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Dropzone */}
          {!file ? (
            <Dropzone
              multiple={false}
              onDrop={handleFileDrop}
              accept={{
                "application/pdf": [".pdf"],
                "image/png": [".png"],
                "image/jpeg": [".jpg", ".jpeg"],
                "image/gif": [".gif"],
              }}
            >
              {({ getRootProps, getInputProps, isDragActive }) => (
                <div
                  {...getRootProps()}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Icons.upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground text-center">
                    {t("upload.dragDrop")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("upload.allowedTypes")}
                  </p>
                </div>
              )}
            </Dropzone>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-background rounded-md">
                {isPdf ? (
                  <Icons.fileText className="h-6 w-6 text-red-500" />
                ) : (
                  <Icons.fileText className="h-6 w-6 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                >
                  <Icons.x className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t("upload.uploading")}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="document-name">{t("name")}</Label>
            <Input
              id="document-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter document name"
              disabled={isUploading}
            />
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="document-type">{t("type")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as EventDocumentType)}
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="schedule">{t("types.schedule")}</SelectItem>
                <SelectItem value="map">{t("types.map")}</SelectItem>
                <SelectItem value="policy">{t("types.policy")}</SelectItem>
                <SelectItem value="brochure">{t("types.brochure")}</SelectItem>
                <SelectItem value="invitation">{t("types.invitation")}</SelectItem>
                <SelectItem value="other">{t("types.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Visibility */}
          <div className="space-y-2">
            <Label>{t("categories")}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={categoryIds.length === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryIds([])}
                disabled={isUploading}
              >
                {t("allCategories")}
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  type="button"
                  variant={categoryIds.includes(cat.id) ? "default" : "outline"}
                  size="sm"
                  disabled={isUploading}
                  onClick={() => {
                    setCategoryIds((prev) =>
                      prev.includes(cat.id)
                        ? prev.filter((id) => id !== cat.id)
                        : [...prev, cat.id]
                    )
                  }}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select which guest categories can see this document in emails.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !name.trim() || isUploading}
          >
            {isUploading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {t("upload.uploading")}
              </>
            ) : (
              <>
                <Icons.upload className="mr-2 h-4 w-4" />
                {t("uploadButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
