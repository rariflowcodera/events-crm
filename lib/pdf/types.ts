export interface PdfDocItem {
  slug: string
  title: string
  description?: string
  order: number
  htmlContent: string
  markdocContent?: unknown // Markdoc AST for react-pdf rendering
  level: number
}

export interface PdfOptions {
  title?: string
  subtitle?: string
  includeTableOfContents?: boolean
  includeCoverPage?: boolean
  pageSize?: "a4" | "letter"
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface PdfGenerationProgress {
  stage: "fetching" | "rendering" | "generating" | "complete" | "error"
  current?: number
  total?: number
  message?: string
}

export interface ExportResponse {
  docs: PdfDocItem[]
  generatedAt: string
  totalDocs: number
}
