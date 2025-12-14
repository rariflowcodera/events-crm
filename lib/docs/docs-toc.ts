import type { RenderableTreeNode } from "@markdoc/markdoc"

import type { TocItem } from "./types"

function isTagNode(
  node: unknown
): node is { name: string; attributes: Record<string, unknown>; children: unknown[] } {
  return (
    typeof node === "object" &&
    node !== null &&
    "name" in node &&
    "attributes" in node &&
    "children" in node
  )
}

function extractTextFromNode(node: unknown): string {
  if (typeof node === "string") return node
  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join("")
  }
  if (isTagNode(node)) {
    return extractTextFromNode(node.children)
  }
  return ""
}

export function extractToc(content: RenderableTreeNode): TocItem[] {
  const headings: TocItem[] = []

  function walk(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }

    if (isTagNode(node) && node.name === "Heading") {
      const level = node.attributes.level as number
      const id = node.attributes.id as string
      const text = extractTextFromNode(node.children)

      // Only include h2 and h3 for table of contents
      if (level >= 2 && level <= 3) {
        headings.push({
          id,
          text,
          level,
          children: [],
        })
      }
    }

    if (isTagNode(node) && node.children) {
      walk(node.children)
    }
  }

  walk(content)

  // Build nested structure (h3s become children of preceding h2)
  const nested: TocItem[] = []
  let currentH2: TocItem | null = null

  for (const heading of headings) {
    if (heading.level === 2) {
      currentH2 = { ...heading, children: [] }
      nested.push(currentH2)
    } else if (heading.level === 3 && currentH2) {
      currentH2.children.push(heading)
    } else {
      nested.push(heading)
    }
  }

  return nested
}
