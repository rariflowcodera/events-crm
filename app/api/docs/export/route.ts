import { NextResponse, type NextRequest } from "next/server"
import Markdoc from "@markdoc/markdoc"

import { getAllDocs } from "@/lib/docs"
import type { DocItem } from "@/lib/docs/types"
import type { PdfDocItem, ExportResponse } from "@/lib/pdf/types"

function flattenDocs(items: DocItem[], level = 0): PdfDocItem[] {
  return items.flatMap((doc) => [
    {
      slug: doc.slug,
      title: doc.frontmatter.title,
      description: doc.frontmatter.description,
      order: doc.frontmatter.order,
      htmlContent: Markdoc.renderers.html(doc.content),
      markdocContent: doc.content, // Include Markdoc AST for react-pdf rendering
      level,
    },
    ...flattenDocs(doc.children, level + 1),
  ])
}

// Find a section by slug and return it with its children
function findSectionBySlug(
  items: DocItem[],
  sectionSlug: string
): DocItem | null {
  for (const doc of items) {
    // Check if this doc matches the section slug
    if (doc.slug === sectionSlug) {
      return doc
    }
    // Check if section slug starts with this doc's slug (nested section)
    if (sectionSlug.startsWith(doc.slug + "/")) {
      const found = findSectionBySlug(doc.children, sectionSlug)
      if (found) return found
    }
    // Also check children directly
    const found = findSectionBySlug(doc.children, sectionSlug)
    if (found) return found
  }
  return null
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ExportResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section")

    const docs = await getAllDocs()

    let docsToExport: DocItem[]

    if (section) {
      // Find the specific section and export only that subtree
      const sectionDoc = findSectionBySlug(docs, section)
      docsToExport = sectionDoc ? [sectionDoc] : []
    } else {
      docsToExport = docs
    }

    const flatDocs = flattenDocs(docsToExport)

    return NextResponse.json({
      docs: flatDocs,
      generatedAt: new Date().toISOString(),
      totalDocs: flatDocs.length,
    })
  } catch (error) {
    console.error("Failed to export docs:", error)
    return NextResponse.json(
      {
        docs: [],
        generatedAt: new Date().toISOString(),
        totalDocs: 0,
      },
      { status: 500 }
    )
  }
}
