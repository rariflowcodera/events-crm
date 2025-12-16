# 22. Documentation PDF Export

**Status: COMPLETED**

## Overview

Add client-side PDF export functionality to the in-dashboard documentation system. Users can export all documentation pages as a single formatted PDF with cover page and table of contents.

## Requirements

| Requirement | Decision |
|-------------|----------|
| Generation | Client-side (browser) |
| Library | jsPDF + html2canvas |
| UI Location | Button in docs header |
| Content Scope | All documentation pages |
| Output | Single PDF with TOC |

## Technology Stack

| Component | Technology |
|-----------|------------|
| PDF generation | `jspdf` |
| HTML to canvas | `html2canvas` |
| Content source | Existing Markdoc → HTML conversion |

## Dependencies

```bash
pnpm add jspdf html2canvas
pnpm add -D @types/html2canvas
```

## Architecture

```
User clicks "Export PDF"
         ↓
API Route: /api/docs/export
         ↓
Server: getAllDocs() → Markdoc.renderers.html()
         ↓
Client: Receives JSON with all docs + HTML content
         ↓
PDF Generator:
  1. Create hidden DOM container
  2. Render HTML with PDF_CSS styles
  3. html2canvas captures as image
  4. jsPDF adds images to PDF pages
         ↓
Browser: Download PDF file
```

## File Structure

```
lib/
  pdf/
    types.ts              # TypeScript interfaces
    pdf-styles.ts         # Styling constants and CSS
    pdf-generator.ts      # Core generation class
    index.ts              # Module exports

app/
  api/
    docs/
      export/
        route.ts          # API endpoint

hooks/
  use-pdf-export.ts       # React hook for export logic

components/
  docs/
    docs-export-button.tsx  # Export button component
```

## Implementation

### Phase 1: Setup

1. Install dependencies (`jspdf`, `html2canvas`)
2. Create `/lib/pdf/types.ts` with interfaces
3. Create `/lib/pdf/pdf-styles.ts` with styling constants

### Phase 2: API Route

Create `/app/api/docs/export/route.ts`:

```typescript
import { getAllDocs } from "@/lib/docs"
import Markdoc from "@markdoc/markdoc"

export async function GET() {
  const docs = await getAllDocs()

  function flattenDocs(items: DocItem[], level = 0): PdfDocItem[] {
    return items.flatMap(doc => [
      {
        slug: doc.slug,
        title: doc.frontmatter.title,
        description: doc.frontmatter.description,
        order: doc.frontmatter.order,
        htmlContent: Markdoc.renderers.html(doc.content),
        level
      },
      ...flattenDocs(doc.children, level + 1)
    ])
  }

  return Response.json({
    docs: flattenDocs(docs),
    generatedAt: new Date().toISOString()
  })
}
```

### Phase 3: PDF Generator

Create `/lib/pdf/pdf-generator.ts` with class:

| Method | Purpose |
|--------|---------|
| `generate(docs)` | Main entry, returns PDF Blob |
| `addCoverPage()` | Title, subtitle, date |
| `addTableOfContents(docs)` | Linked TOC with page numbers |
| `addDocumentPage(doc)` | Render HTML → canvas → PDF |
| `addPageNumbers()` | Footer on all pages |

### Phase 4: Hook & Component

Create `/hooks/use-pdf-export.ts`:

```typescript
export function usePdfExport(options?: PdfOptions) {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<PdfGenerationProgress | null>(null)

  const exportPdf = useCallback(async () => {
    setIsExporting(true)
    // 1. Fetch docs from /api/docs/export
    // 2. Dynamic import pdf-generator (code splitting)
    // 3. Generate PDF with progress callbacks
    // 4. Trigger browser download
  }, [options])

  return { exportPdf, isExporting, progress }
}
```

Create `/components/docs/docs-export-button.tsx`:

```typescript
"use client"

export function DocsExportButton() {
  const { exportPdf, isExporting, progress } = usePdfExport()

  return (
    <Button onClick={exportPdf} disabled={isExporting}>
      {isExporting ? <Loader2 className="animate-spin" /> : <FileDown />}
      {isExporting ? progress?.message : "Export PDF"}
    </Button>
  )
}
```

### Phase 5: Layout Integration

Update `/app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/docs/layout.tsx`:

```typescript
export default async function DocsLayout({ children, params }) {
  const { slug } = await params
  const tree = await getDocsNavTree()

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 border-r md:block">
        <DocsNavigation tree={tree} slug={slug} />
      </aside>

      <div className="flex-1 flex flex-col">
        {/* New: Docs header with export button */}
        <div className="flex items-center justify-end border-b px-4 py-2">
          <DocsExportButton />
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
```

## PDF Structure

```
┌─────────────────────────────────┐
│         COVER PAGE              │
│   Events CRM Documentation      │
│        User Guide               │
│   Generated: Dec 15, 2025       │
├─────────────────────────────────┤
│     TABLE OF CONTENTS           │
│  1. Getting Started........3    │
│     - Dashboard Overview....4   │
│     - Creating Events.......5   │
│  2. Admin Guide.............6   │
│  ...                            │
├─────────────────────────────────┤
│        CONTENT PAGES            │
│  (Each doc as formatted page)   │
│                                 │
│                    Page 3 of 28 │
└─────────────────────────────────┘
```

## Type Definitions

```typescript
// lib/pdf/types.ts

export interface PdfDocItem {
  slug: string
  title: string
  description?: string
  order: number
  htmlContent: string
  level: number
}

export interface PdfOptions {
  title?: string
  subtitle?: string
  includeTableOfContents?: boolean
  includeCoverPage?: boolean
  pageSize?: 'a4' | 'letter'
}

export interface PdfGenerationProgress {
  stage: 'fetching' | 'rendering' | 'generating' | 'complete' | 'error'
  current?: number
  total?: number
  message?: string
}
```

## Styling Constants

```typescript
// lib/pdf/pdf-styles.ts

export const PDF_STYLES = {
  page: {
    width: 595.28,   // A4 width in points
    height: 841.89,  // A4 height in points
    margins: { top: 40, right: 40, bottom: 60, left: 40 }
  },
  fonts: {
    title: { size: 24 },
    heading1: { size: 18 },
    heading2: { size: 14 },
    body: { size: 10 },
    pageNumber: { size: 9 }
  }
}

export const PDF_CSS = `
  .pdf-content {
    font-family: system-ui, sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    max-width: 515px;
  }
  .pdf-content h1 { font-size: 18pt; margin: 20pt 0 10pt; }
  .pdf-content h2 { font-size: 14pt; margin: 16pt 0 8pt; }
  .pdf-content code { background: #f3f4f6; padding: 2pt 4pt; }
  .pdf-content pre { background: #f3f4f6; padding: 10pt; }
  .pdf-content .callout { border-left: 3pt solid #3b82f6; padding: 10pt; }
`
```

## i18n

Add to `messages/en.json`:

```json
{
  "docs": {
    "exportPdf": "Export PDF",
    "exportPdfTooltip": "Export all documentation as PDF",
    "exporting": "Exporting...",
    "loadingDocs": "Loading documentation...",
    "preparingContent": "Preparing content...",
    "downloadComplete": "Download complete!",
    "exportFailed": "PDF export failed"
  }
}
```

Add to `messages/ar.json`:

```json
{
  "docs": {
    "exportPdf": "تصدير PDF",
    "exportPdfTooltip": "تصدير جميع الوثائق كملف PDF",
    "exporting": "جارٍ التصدير...",
    "loadingDocs": "جارٍ تحميل الوثائق...",
    "preparingContent": "جارٍ تجهيز المحتوى...",
    "downloadComplete": "اكتمل التنزيل!",
    "exportFailed": "فشل تصدير PDF"
  }
}
```

## Files Created

| Path | Purpose | Status |
|------|---------|--------|
| `lib/pdf/types.ts` | TypeScript interfaces | ✓ |
| `lib/pdf/pdf-styles.ts` | Styling constants | ✓ |
| `lib/pdf/pdf-generator.ts` | Core PDF generation | ✓ |
| `lib/pdf/index.ts` | Module exports | ✓ |
| `app/api/docs/export/route.ts` | API endpoint | ✓ |
| `hooks/use-pdf-export.ts` | Export hook | ✓ |
| `components/docs/docs-export-button.tsx` | Export button | ✓ |

## Files Modified

| Path | Change | Status |
|------|--------|--------|
| `app/[locale]/(web)/(dashboard)/[slug]/(sidebar)/(breadcrumbs)/docs/layout.tsx` | Add header with export button | ✓ |
| `components/docs/index.ts` | Export DocsExportButton | ✓ |
| `messages/en.json` | Add i18n strings | ✓ |
| `messages/ar.json` | Add Arabic i18n strings | ✓ |

## Considerations

| Issue | Solution |
|-------|----------|
| Bundle size | Dynamic import jsPDF/html2canvas |
| Memory usage | Process docs sequentially |
| RTL support | html2canvas preserves RTL layout |
| Long content | Automatic pagination across pages |
| Code blocks | Include syntax highlighting CSS |
| Progress feedback | Show stage and current doc being processed |

## Testing Checklist

- [ ] Export button renders in docs header
- [ ] Shows loading state during export
- [ ] PDF downloads with timestamped filename
- [ ] Cover page displays correctly
- [ ] TOC lists all docs with page numbers
- [ ] All docs included in correct order
- [ ] Headings render with hierarchy
- [ ] Code blocks are readable
- [ ] Callouts display with styling
- [ ] Page numbers appear in footer
- [ ] Error handling shows message
- [ ] Works in Chrome, Firefox, Safari
- [ ] Arabic content renders RTL correctly
