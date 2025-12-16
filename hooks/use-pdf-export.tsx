"use client"

import { useState, useCallback } from "react"

import type {
  PdfOptions,
  PdfGenerationProgress,
  ExportResponse,
} from "@/lib/pdf/types"

interface UsePdfExportOptions extends PdfOptions {
  section?: string // Section slug to export (e.g., "getting-started")
}

interface UsePdfExportReturn {
  exportPdf: () => Promise<void>
  isExporting: boolean
  progress: PdfGenerationProgress | null
  error: string | null
}

export function usePdfExport(options?: UsePdfExportOptions): UsePdfExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<PdfGenerationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exportPdf = useCallback(async () => {
    setIsExporting(true)
    setError(null)
    setProgress({ stage: "fetching", message: "Loading documentation..." })

    try {
      // 1. Fetch docs from API (optionally filtered by section)
      const url = options?.section
        ? `/api/docs/export?section=${encodeURIComponent(options.section)}`
        : "/api/docs/export"
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch documentation")
      }

      const data: ExportResponse = await response.json()

      if (data.docs.length === 0) {
        throw new Error("No documentation found to export")
      }

      setProgress({ stage: "generating", message: "Generating PDF..." })

      // 2. Dynamically import react-pdf (code splitting)
      const { pdf } = await import("@react-pdf/renderer")
      const { PdfDocument } = await import("@/lib/pdf/react-pdf-document")

      // 3. Generate PDF using react-pdf (pass options without section)
      const { section: _, ...pdfOptions } = options || {}
      const blob = await pdf(
        <PdfDocument docs={data.docs} options={pdfOptions} />
      ).toBlob()

      // 4. Trigger download with appropriate filename
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      const dateStr = new Date().toISOString().split("T")[0]
      const filename = options?.section
        ? `${options.section}-${dateStr}.pdf`
        : `documentation-${dateStr}.pdf`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)

      setProgress({ stage: "complete", message: "Download complete!" })

      // Clear progress after a delay
      setTimeout(() => {
        setProgress(null)
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF generation failed"
      console.error("PDF export failed:", err)
      setError(message)
      setProgress({ stage: "error", message })
    } finally {
      setIsExporting(false)
    }
  }, [options])

  return { exportPdf, isExporting, progress, error }
}
