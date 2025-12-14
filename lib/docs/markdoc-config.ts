import Markdoc, { type Config, type Node, type Tag } from "@markdoc/markdoc"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim()
}

function extractTextFromChildren(children: unknown[]): string {
  return children
    .map((child) => {
      if (typeof child === "string") return child
      if (child && typeof child === "object" && "children" in child) {
        return extractTextFromChildren((child as { children: unknown[] }).children)
      }
      return ""
    })
    .join("")
}

// Custom nodes - adds IDs to headings for anchor links
export const nodes: Config["nodes"] = {
  heading: {
    render: "Heading",
    attributes: {
      level: { type: Number, required: true },
      id: { type: String },
    },
    transform(node: Node, config: Config) {
      const children = node.transformChildren(config)
      const text = extractTextFromChildren(children)
      const id = slugify(text)
      return new Markdoc.Tag("Heading", { level: node.attributes.level, id }, children)
    },
  },
  link: {
    render: "Link",
    attributes: {
      href: { type: String, required: true },
    },
  },
  code: {
    render: "Code",
    attributes: {
      content: { type: String },
    },
  },
  fence: {
    render: "CodeBlock",
    attributes: {
      language: { type: String },
      content: { type: String },
    },
  },
}

// Custom tags for enhanced content
export const tags: Config["tags"] = {
  callout: {
    render: "Callout",
    attributes: {
      type: { type: String, default: "info" }, // info, warning, error, success
      title: { type: String },
    },
  },
}

// Markdoc configuration
export const markdocConfig: Config = {
  nodes,
  tags,
}
