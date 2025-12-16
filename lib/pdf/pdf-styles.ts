export const PDF_STYLES = {
  page: {
    width: 595.28, // A4 width in points
    height: 841.89, // A4 height in points
    margins: { top: 40, right: 40, bottom: 50, left: 40 },
    contentWidth: 515.28, // width - left margin - right margin (595.28 - 80)
  },
  fonts: {
    title: { size: 28, lineHeight: 1.2 },
    subtitle: { size: 16, lineHeight: 1.4 },
    heading1: { size: 20, lineHeight: 1.3 },
    heading2: { size: 16, lineHeight: 1.3 },
    heading3: { size: 14, lineHeight: 1.3 },
    body: { size: 11, lineHeight: 1.5 },
    tocItem: { size: 11, lineHeight: 2 },
    pageNumber: { size: 9 },
    footer: { size: 8 },
  },
  colors: {
    primary: "#1a1a1a",
    secondary: "#666666",
    accent: "#3b82f6",
    muted: "#9ca3af",
    border: "#e5e7eb",
  },
} as const

export const PDF_CSS = `
  * {
    box-sizing: border-box;
  }

  .pdf-content {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.5;
    color: #1a1a1a;
    width: 100%;
    padding: 0;
    margin: 0;
  }

  .pdf-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .pdf-content h1 {
    font-size: 16pt;
    margin: 16pt 0 8pt 0;
    font-weight: 600;
    color: #1a1a1a;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 6pt;
  }

  .pdf-content h2 {
    font-size: 13pt;
    margin: 14pt 0 6pt 0;
    font-weight: 600;
    color: #1a1a1a;
  }

  .pdf-content h3 {
    font-size: 11pt;
    margin: 12pt 0 5pt 0;
    font-weight: 600;
    color: #1a1a1a;
  }

  .pdf-content h4 {
    font-size: 10pt;
    margin: 10pt 0 4pt 0;
    font-weight: 600;
    color: #1a1a1a;
  }

  .pdf-content p {
    margin: 5pt 0;
  }

  .pdf-content ul,
  .pdf-content ol {
    margin: 5pt 0;
    padding-left: 18pt;
  }

  .pdf-content li {
    margin: 2pt 0;
  }

  .pdf-content code {
    background: #f3f4f6;
    padding: 1pt 3pt;
    border-radius: 2pt;
    font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-size: 8pt;
  }

  .pdf-content pre {
    background: #f3f4f6;
    padding: 8pt;
    border-radius: 4pt;
    overflow-x: auto;
    font-size: 8pt;
    margin: 8pt 0;
    border: 1px solid #e5e7eb;
  }

  .pdf-content pre code {
    background: transparent;
    padding: 0;
    font-size: inherit;
  }

  .pdf-content blockquote {
    border-left: 3pt solid #3b82f6;
    padding-left: 12pt;
    margin: 12pt 0;
    color: #666666;
    font-style: italic;
  }

  .pdf-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0;
    font-size: 8pt;
  }

  .pdf-content th,
  .pdf-content td {
    border: 1px solid #e5e7eb;
    padding: 5pt;
    text-align: left;
  }

  .pdf-content th {
    background: #f9fafb;
    font-weight: 600;
  }

  .pdf-content a {
    color: #3b82f6;
    text-decoration: none;
  }

  .pdf-content img {
    max-width: 100%;
    height: auto;
  }

  .pdf-content hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 16pt 0;
  }

  /* Callout styles */
  .pdf-content .callout {
    padding: 8pt;
    border-radius: 4pt;
    margin: 8pt 0;
    border-left: 3pt solid;
  }

  .pdf-content .callout-info {
    background: #eff6ff;
    border-left-color: #3b82f6;
  }

  .pdf-content .callout-warning {
    background: #fffbeb;
    border-left-color: #f59e0b;
  }

  .pdf-content .callout-error {
    background: #fef2f2;
    border-left-color: #ef4444;
  }

  .pdf-content .callout-success {
    background: #f0fdf4;
    border-left-color: #22c55e;
  }

  .pdf-content .callout-title {
    font-weight: 600;
    margin-bottom: 4pt;
  }
`
