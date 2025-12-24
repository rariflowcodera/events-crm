"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"

interface VappDownloadButtonProps {
  elementId: string
  filename: string
  locale: string
  token: string
}

export function VappDownloadButton({
  elementId,
  filename,
  locale,
  token,
}: VappDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const isArabic = locale === "ar"

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Call server-side Puppeteer API
      const response = await fetch(`/api/vapp/pdf?token=${token}&locale=${locale}`)

      if (!response.ok) {
        throw new Error("Failed to generate PDF")
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${filename}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to download PDF:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = () => {
    setIsPrinting(true)
    window.print()
    setIsPrinting(false)
  }

  return (
    <div className="flex gap-3">
      <Button
        variant="outline"
        onClick={handlePrint}
        disabled={isPrinting || isDownloading}
      >
        {isPrinting ? (
          <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.printer className="mr-2 h-4 w-4" />
        )}
        {isArabic ? "طباعة" : "Print"}
      </Button>
      <Button onClick={handleDownload} disabled={isDownloading || isPrinting}>
        {isDownloading ? (
          <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.download className="mr-2 h-4 w-4" />
        )}
        {isArabic ? "تحميل PDF" : "Download PDF"}
      </Button>
    </div>
  )
}
