import React from "react"
import { Document, Page, Text, View } from "@react-pdf/renderer"

import { pdfStyles } from "./react-pdf-styles"
import { renderMarkdocNode } from "./react-pdf-renderer"
import type { PdfDocItem, PdfOptions } from "./types"

interface Props {
  docs: PdfDocItem[]
  options?: PdfOptions
}

export function PdfDocument({ docs, options = {} }: Props) {
  const {
    title = "Documentation",
    subtitle = "Events CRM",
    includeCoverPage = true,
    includeTableOfContents = true,
  } = options

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Document>
      {/* Cover Page */}
      {includeCoverPage && (
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.coverPage}>
            <Text style={pdfStyles.coverTitle}>{title}</Text>
            <Text style={pdfStyles.coverSubtitle}>{subtitle}</Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
                width: 200,
                marginVertical: 24,
              }}
            />
            <Text style={pdfStyles.coverDate}>Generated: {dateStr}</Text>
          </View>
        </Page>
      )}

      {/* Table of Contents */}
      {includeTableOfContents && (
        <Page size="A4" style={pdfStyles.page} wrap>
          <Text style={pdfStyles.tocTitle}>Table of Contents</Text>
          {docs.map((doc, i) => (
            <View
              key={i}
              style={[pdfStyles.tocItem, { paddingLeft: doc.level * 15 }]}
            >
              <Text
                style={[
                  pdfStyles.tocItemTitle,
                  doc.level === 0
                    ? { fontWeight: "bold" }
                    : { color: "#666666" },
                ]}
              >
                {doc.title}
              </Text>
            </View>
          ))}
          <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
            fixed
          />
        </Page>
      )}

      {/* Content Pages - Each doc in its own section that can wrap across pages */}
      {docs.map((doc, docIndex) => (
        <Page key={docIndex} size="A4" style={pdfStyles.page} wrap>
          {/* Document Title */}
          <Text style={pdfStyles.docTitle}>{doc.title}</Text>

          {/* Document Description */}
          {doc.description ? (
            <Text style={pdfStyles.docDescription}>{doc.description}</Text>
          ) : null}

          {/* Document Content from Markdoc AST */}
          {doc.markdocContent ? renderMarkdocNode(doc.markdocContent as any) : null}

          {/* Page Number */}
          <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
            fixed
          />
        </Page>
      ))}
    </Document>
  )
}
