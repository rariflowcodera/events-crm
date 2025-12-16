"use client"

import { usePathname } from "next/navigation"
import { ChevronDown, FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePdfExport } from "@/hooks/use-pdf-export"

// Map section slugs to display titles
const SECTION_TITLES: Record<string, string> = {
  "getting-started": "Getting Started",
  "admin-guide": "Admin Guide",
  "managing-guests": "Managing Guests",
  "guest-categories": "Guest Categories",
  "email-templates": "Email Templates",
  "rsvp-forms": "RSVP Forms",
  branding: "Branding",
  faq: "FAQ",
}

function getSectionFromPath(pathname: string): {
  slug: string
  title: string
} | null {
  // Extract section from path like /en/workspace-slug/docs/getting-started/overview
  const match = pathname.match(/\/docs\/([^/]+)/)
  if (!match) return null

  const slug = match[1]
  const title = SECTION_TITLES[slug] || slug.replace(/-/g, " ")
  return { slug, title }
}

export function DocsExportButton() {
  const pathname = usePathname()
  const currentSection = getSectionFromPath(pathname)

  const {
    exportPdf: exportAll,
    isExporting: isExportingAll,
    progress: progressAll,
  } = usePdfExport({
    title: "Events CRM Documentation",
    subtitle: "Complete User Guide",
  })

  const {
    exportPdf: exportSection,
    isExporting: isExportingSection,
    progress: progressSection,
  } = usePdfExport(
    currentSection
      ? {
          section: currentSection.slug,
          title: currentSection.title,
          subtitle: "Documentation",
        }
      : undefined
  )

  const isExporting = isExportingAll || isExportingSection
  const progress = progressAll || progressSection

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
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
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAll} disabled={isExporting}>
          <FileDown className="mr-2 h-4 w-4" />
          Export All Documentation
        </DropdownMenuItem>
        {currentSection && (
          <DropdownMenuItem onClick={exportSection} disabled={isExporting}>
            <FileDown className="mr-2 h-4 w-4" />
            Export "{currentSection.title}"
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
