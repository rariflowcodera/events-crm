import { NextResponse } from "next/server"
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

export async function GET(): Promise<NextResponse<ExportResponse>> {
  try {
    const docs = await getAllDocs()
    const flatDocs = flattenDocs(docs)

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
