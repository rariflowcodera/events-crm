import { useState, useCallback } from "react"
import {
  useCreateEventDocument,
  useReplaceEventDocumentFile,
} from "@/trpc/hooks/document-hooks"
import type { EventDocumentType } from "@/server/db/schemas/event-document"

type DocumentUploadResponse = {
  data: {
    preSignedUrl?: string
    uploadUrl?: string
    documentUrl: string
    storageProvider: "local" | "s3"
    eventId: string
  }
}

async function getDocumentUploadUrl(
  file: File,
  eventId: string
): Promise<DocumentUploadResponse> {
  const res = await fetch("/api/document-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      filetype: file.type,
      filesize: file.size,
      eventId,
    }),
  })

  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.message || "Failed to get upload URL")
  }

  return await res.json()
}

async function uploadFile(
  url: string,
  file: File,
  storageProvider: "local" | "s3",
  eventId: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  // Local upload - use FormData POST
  if (storageProvider === "local") {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("eventId", eventId)

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.message || "Upload failed")
    }

    const json = await res.json()
    return json.data?.documentUrl || null
  }

  // S3 upload - use pre-signed URL with PUT and track progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(null) // S3 upload successful, URL is already known
      } else {
        reject(new Error("Upload failed"))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Upload failed")))

    xhr.open("PUT", url, true)
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.setRequestHeader("Cache-Control", "max-age=63072000")
    xhr.send(file)
  })
}

export function useDocumentUpload(eventId: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { mutateAsync: createDocument } = useCreateEventDocument()
  const { mutateAsync: replaceDocumentFile } = useReplaceEventDocumentFile()

  // Get an upload URL and transfer the file; returns the resulting document URL.
  const performTransfer = useCallback(
    async (file: File, onProgress?: (progress: number) => void) => {
      const response = await getDocumentUploadUrl(file, eventId)
      const { data } = response

      const uploadUrl =
        data.storageProvider === "local" ? data.uploadUrl! : data.preSignedUrl!

      const localUrl = await uploadFile(
        uploadUrl,
        file,
        data.storageProvider,
        eventId,
        onProgress
      )

      // For local storage, use the returned URL; for S3, use the pre-computed URL
      return localUrl || data.documentUrl
    },
    [eventId]
  )

  const upload = useCallback(
    async (
      file: File,
      metadata: {
        name: string
        type: EventDocumentType
        categoryIds: string[] | null
      }
    ) => {
      setIsUploading(true)
      setProgress(0)

      try {
        const finalUrl = await performTransfer(file, setProgress)

        await createDocument({
          eventId,
          name: metadata.name,
          fileName: file.name,
          url: finalUrl,
          mimeType: file.type,
          fileSize: file.size,
          type: metadata.type,
          categoryIds: metadata.categoryIds,
        })

        return finalUrl
      } finally {
        setIsUploading(false)
        setProgress(0)
      }
    },
    [eventId, createDocument, performTransfer]
  )

  const replace = useCallback(
    async (documentId: string, file: File) => {
      setIsUploading(true)
      setProgress(0)

      try {
        const finalUrl = await performTransfer(file, setProgress)

        await replaceDocumentFile({
          documentId,
          fileName: file.name,
          url: finalUrl,
          mimeType: file.type,
          fileSize: file.size,
        })

        return finalUrl
      } finally {
        setIsUploading(false)
        setProgress(0)
      }
    },
    [replaceDocumentFile, performTransfer]
  )

  return { upload, replace, isUploading, progress }
}
