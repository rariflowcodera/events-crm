"use client"

import { FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePdfExport } from "@/hooks/use-pdf-export"

interface DocsExportButtonProps {
  title?: string
  subtitle?: string
}

export function DocsExportButton({
  title = "Events CRM Documentation",
  subtitle = "User Guide",
}: DocsExportButtonProps) {
  const { exportPdf, isExporting, progress } = usePdfExport({
    title,
    subtitle,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={exportPdf}
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">
                {progress?.message || "Exporting..."}
              </span>
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Export all documentation as PDF</p>
      </TooltipContent>
    </Tooltip>
  )
}
