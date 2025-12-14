import React from "react"
import Markdoc, { type RenderableTreeNode } from "@markdoc/markdoc"

import { markdocComponents } from "./markdoc-components"

interface DocsContentRendererProps {
  content: RenderableTreeNode
}

export function DocsContentRenderer({ content }: DocsContentRendererProps) {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-code:before:content-[''] prose-code:after:content-['']">
      {Markdoc.renderers.react(content, React, { components: markdocComponents })}
    </article>
  )
}
