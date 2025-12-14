import fs from "fs/promises"
import path from "path"
import Markdoc from "@markdoc/markdoc"
import matter from "gray-matter"

import { markdocConfig } from "./markdoc-config"
import type { DocFrontmatter, DocItem, DocNavItem } from "./types"

const DOCS_PATH = path.join(process.cwd(), "content/documentation")

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readDirectory(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath)
  } catch {
    return []
  }
}

export async function getDocBySlug(slugPath: string): Promise<DocItem | null> {
  // Try direct file path first
  let filePath = path.join(DOCS_PATH, `${slugPath}.mdoc`)

  if (!(await fileExists(filePath))) {
    // Try as directory with index file
    filePath = path.join(DOCS_PATH, slugPath, `${path.basename(slugPath)}.mdoc`)
  }

  if (!(await fileExists(filePath))) {
    return null
  }

  const fileContent = await fs.readFile(filePath, "utf-8")
  const { data, content } = matter(fileContent)

  const frontmatter = data as DocFrontmatter

  // Skip draft content
  if (frontmatter.status === "draft") {
    return null
  }

  const ast = Markdoc.parse(content)
  const transformedContent = Markdoc.transform(ast, markdocConfig)

  return {
    slug: slugPath,
    path: filePath,
    frontmatter: {
      title: frontmatter.title || "Untitled",
      description: frontmatter.description,
      order: frontmatter.order ?? 999,
      status: frontmatter.status || "published",
      collapsible: frontmatter.collapsible ?? false,
      collapsed: frontmatter.collapsed ?? false,
    },
    content: transformedContent,
    children: [],
  }
}

async function scanDirectory(
  dirPath: string,
  parentSlug: string = ""
): Promise<DocItem[]> {
  const items: DocItem[] = []
  const entries = await readDirectory(dirPath)

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry)
    const stat = await fs.stat(entryPath)

    if (stat.isDirectory()) {
      // Check for index file (folder/folder.mdoc pattern)
      const indexFile = path.join(entryPath, `${entry}.mdoc`)
      const slug = parentSlug ? `${parentSlug}/${entry}` : entry

      if (await fileExists(indexFile)) {
        const doc = await getDocBySlug(slug)
        if (doc) {
          // Recursively get children
          const childItems = await scanDirectory(entryPath, slug)
          // Filter out the parent file from children
          doc.children = childItems.filter(
            (child) => child.slug !== slug
          )
          items.push(doc)
        }
      } else {
        // No index file, just scan children
        const childItems = await scanDirectory(entryPath, slug)
        items.push(...childItems)
      }
    } else if (entry.endsWith(".mdoc")) {
      const fileName = entry.replace(".mdoc", "")
      const folderName = path.basename(dirPath)

      // Skip if this is the index file (already handled above)
      if (fileName === folderName && parentSlug) {
        continue
      }

      const slug = parentSlug ? `${parentSlug}/${fileName}` : fileName
      const doc = await getDocBySlug(slug)
      if (doc) {
        items.push(doc)
      }
    }
  }

  // Sort by order
  return items.sort((a, b) => a.frontmatter.order - b.frontmatter.order)
}

export async function getAllDocs(): Promise<DocItem[]> {
  if (!(await fileExists(DOCS_PATH))) {
    return []
  }

  return scanDirectory(DOCS_PATH)
}

export async function getDocsTree(): Promise<DocItem[]> {
  const docs = await getAllDocs()
  return docs
}

// Convert DocItem to DocNavItem (strips content for Client Component serialization)
function toNavItem(doc: DocItem): DocNavItem {
  return {
    slug: doc.slug,
    frontmatter: doc.frontmatter,
    children: doc.children.map(toNavItem),
  }
}

// Returns navigation-only tree (safe to pass to Client Components)
export async function getDocsNavTree(): Promise<DocNavItem[]> {
  const docs = await getAllDocs()
  return docs.map(toNavItem)
}
