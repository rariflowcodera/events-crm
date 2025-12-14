import type { RenderableTreeNode } from "@markdoc/markdoc"

export interface DocFrontmatter {
  title: string
  description?: string
  order: number
  status: "draft" | "published"
  collapsible?: boolean
  collapsed?: boolean
}

export interface DocItem {
  slug: string
  path: string
  frontmatter: DocFrontmatter
  content: RenderableTreeNode
  children: DocItem[]
}

export interface TocItem {
  id: string
  text: string
  level: number
  children: TocItem[]
}

// Navigation-only type (without content) for passing to Client Components
export interface DocNavItem {
  slug: string
  frontmatter: DocFrontmatter
  children: DocNavItem[]
}
