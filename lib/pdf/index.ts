// Legacy jsPDF exports (kept for backwards compatibility)
export { DocumentationPdfGenerator } from "./pdf-generator"
export { PDF_STYLES, PDF_CSS } from "./pdf-styles"

// New react-pdf exports
export { pdfStyles } from "./react-pdf-styles"
export { renderMarkdocNode } from "./react-pdf-renderer"
export { PdfDocument } from "./react-pdf-document"

// Types
export type {
  PdfDocItem,
  PdfOptions,
  PdfGenerationProgress,
  ExportResponse,
} from "./types"
