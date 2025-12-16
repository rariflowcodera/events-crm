import React from "react"
import { Text, View, Link } from "@react-pdf/renderer"

import { pdfStyles } from "./react-pdf-styles"

type MarkdocNode =
  | string
  | null
  | {
      $$mdtype?: string
      name: string
      attributes?: Record<string, unknown>
      children?: MarkdocNode[]
    }

// Extract text content from nested nodes
function extractText(node: MarkdocNode): string {
  if (typeof node === "string") return node
  if (!node) return ""
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (node.children) return node.children.map(extractText).join("")
  return ""
}

// Render Markdoc AST node to React-PDF components
export function renderMarkdocNode(
  node: MarkdocNode,
  key: number = 0
): React.ReactNode {
  // Handle string nodes
  if (typeof node === "string") {
    return node
  }

  // Handle null/undefined
  if (!node) {
    return null
  }

  // Handle arrays
  if (Array.isArray(node)) {
    return node.map((child, i) => renderMarkdocNode(child, i))
  }

  // Handle tag nodes
  const { name, attributes = {}, children = [] } = node

  // Render children
  const renderChildren = () =>
    children.map((child, i) => renderMarkdocNode(child, i))

  switch (name) {
    case "article":
    case "section":
    case "div":
      return <View key={key}>{renderChildren()}</View>

    // Markdoc custom Heading tag (with level attribute)
    case "Heading":
    case "heading": {
      const level = attributes.level as number
      const style =
        level === 1
          ? pdfStyles.h1
          : level === 2
            ? pdfStyles.h2
            : level === 3
              ? pdfStyles.h3
              : pdfStyles.h4
      return (
        <Text key={key} style={style}>
          {renderChildren()}
        </Text>
      )
    }

    case "h1":
      return (
        <Text key={key} style={pdfStyles.h1}>
          {renderChildren()}
        </Text>
      )

    case "h2":
      return (
        <Text key={key} style={pdfStyles.h2}>
          {renderChildren()}
        </Text>
      )

    case "h3":
      return (
        <Text key={key} style={pdfStyles.h3}>
          {renderChildren()}
        </Text>
      )

    case "h4":
    case "h5":
    case "h6":
      return (
        <Text key={key} style={pdfStyles.h4}>
          {renderChildren()}
        </Text>
      )

    case "p":
      return (
        <Text key={key} style={pdfStyles.paragraph}>
          {renderChildren()}
        </Text>
      )

    case "ul":
      return (
        <View key={key} style={pdfStyles.list}>
          {children.map((li, i) => {
            if (typeof li === "string" || !li) return null
            // Extract text content from list item, handling nested paragraph nodes
            const content = extractText(li as MarkdocNode)
            return (
              <View key={i} style={pdfStyles.listItem}>
                <Text style={pdfStyles.listBullet}>•</Text>
                <Text style={pdfStyles.listContent}>{content}</Text>
              </View>
            )
          })}
        </View>
      )

    case "ol":
      return (
        <View key={key} style={pdfStyles.list}>
          {children.map((li, i) => {
            if (typeof li === "string" || !li) return null
            // Extract text content from list item, handling nested paragraph nodes
            const content = extractText(li as MarkdocNode)
            return (
              <View key={i} style={pdfStyles.listItem}>
                <Text style={pdfStyles.listBullet}>{i + 1}.</Text>
                <Text style={pdfStyles.listContent}>{content}</Text>
              </View>
            )
          })}
        </View>
      )

    case "li":
      return <View key={key}>{renderChildren()}</View>

    // Markdoc custom Code tag (inline code) - content in attributes
    case "Code":
      return (
        <Text key={key} style={pdfStyles.code}>
          {String(attributes.content || extractText(node))}
        </Text>
      )

    case "code":
      return (
        <Text key={key} style={pdfStyles.code}>
          {extractText(node)}
        </Text>
      )

    // Markdoc custom CodeBlock tag (fenced code) - content in attributes
    case "CodeBlock":
      return (
        <View key={key} style={pdfStyles.codeBlock}>
          <Text>{String(attributes.content || extractText(node))}</Text>
        </View>
      )

    case "pre":
      return (
        <View key={key} style={pdfStyles.codeBlock}>
          <Text>{extractText(node)}</Text>
        </View>
      )

    case "blockquote":
      return (
        <View key={key} style={pdfStyles.blockquote}>
          {renderChildren()}
        </View>
      )

    // Markdoc custom Link tag
    case "Link":
    case "a":
      return (
        <Link
          key={key}
          style={pdfStyles.link}
          src={String(attributes.href || "")}
        >
          {renderChildren()}
        </Link>
      )

    case "strong":
    case "b":
      return (
        <Text key={key} style={pdfStyles.bold}>
          {renderChildren()}
        </Text>
      )

    case "em":
    case "i":
      return (
        <Text key={key} style={pdfStyles.italic}>
          {renderChildren()}
        </Text>
      )

    case "hr":
      return <View key={key} style={pdfStyles.hr} />

    case "br":
      return <Text key={key}>{"\n"}</Text>

    case "table":
      return (
        <View key={key} style={pdfStyles.table}>
          {renderChildren()}
        </View>
      )

    case "thead":
      return <View key={key}>{renderChildren()}</View>

    case "tbody":
      return <View key={key}>{renderChildren()}</View>

    case "tr":
      const isHeader = children.some(
        (child) => typeof child !== "string" && child && child.name === "th"
      )
      return (
        <View
          key={key}
          style={isHeader ? pdfStyles.tableHeaderRow : pdfStyles.tableRow}
        >
          {renderChildren()}
        </View>
      )

    case "th":
      return (
        <Text key={key} style={pdfStyles.tableHeaderCell}>
          {renderChildren()}
        </Text>
      )

    case "td":
      return (
        <Text key={key} style={pdfStyles.tableCell}>
          {renderChildren()}
        </Text>
      )

    case "span":
      return <Text key={key}>{renderChildren()}</Text>

    // Markdoc-specific callout handling
    case "Callout":
    case "callout":
      return (
        <View key={key} style={pdfStyles.blockquote}>
          {attributes.title ? (
            <Text style={pdfStyles.bold}>{String(attributes.title)}</Text>
          ) : null}
          {renderChildren()}
        </View>
      )

    default:
      // For unknown tags, try to render children
      if (children.length > 0) {
        return <View key={key}>{renderChildren()}</View>
      }
      return null
  }
}
