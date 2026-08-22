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
import { Progress } from "@/components/ui/progress"
import { Icons } from "@/components/global/icons"
import { cn } from "@/lib/utils"

const ALLOWED_TYPES = [
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface DocumentReplaceFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: {
    id: string
    eventId: string
    name: string
    fileName: string
  }
}

export function DocumentReplaceFileDialog({
  open,
  onOpenChange,
  document,
}: DocumentReplaceFileDialogProps) {
  const t = useTranslations("documents")
  const tCommon = useTranslations("common")

  const [file, setFile] = useState<File | null>(null)

  const { replace, isUploading, progress } = useDocumentUpload(document.eventId)

  const handleFileDrop = useCallback(
    (acceptedFiles: File[]) => {
      const droppedFile = acceptedFiles[0]
      if (!droppedFile) return

      if (!ALLOWED_TYPES.includes(droppedFile.type)) {
        toast.error(t("errors.invalidType"))
        return
      }

      if (droppedFile.size > MAX_FILE_SIZE) {
        toast.error(t("errors.fileTooLarge"))
        return
      }

      setFile(droppedFile)
    },
    [t]
  )

  const handleClose = () => {
    if (!isUploading) {
      setFile(null)
      onOpenChange(false)
    }
  }

  const handleConfirm = async () => {
    if (!file) return

    try {
      await replace(document.id, file)
      handleClose()
    } catch (error: any) {
      toast.error(error.message || t("errors.uploadFailed"))
    }
  }

  const isPdf = file?.type === "application/pdf"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("replaceFile.title")}</DialogTitle>
          <DialogDescription>
            {t("replaceFile.description", { name: document.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t("upload.uploading")}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {t("upload.uploading")}
              </>
            ) : (
              <>
                <Icons.upload className="mr-2 h-4 w-4" />
                {t("replaceFile.confirm")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
