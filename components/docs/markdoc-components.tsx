import React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Icons } from "@/components/global/icons"

interface HeadingProps {
  level: number
  id: string
  children: React.ReactNode
}

export function Heading({ level, id, children }: HeadingProps) {
  const Component = level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : level === 4 ? "h4" : level === 5 ? "h5" : "h6"

  return (
    <Component id={id} className="scroll-mt-20 group">
      {children}
      <a
        href={`#${id}`}
        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
        aria-hidden
      >
        #
      </a>
    </Component>
  )
}

interface LinkComponentProps {
  href: string
  children: React.ReactNode
}

export function LinkComponent({ href, children }: LinkComponentProps) {
  const isExternal = href.startsWith("http")

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        {children}
        <Icons.externalLink className="inline-block ml-1 h-3 w-3" />
      </a>
    )
  }

  return (
    <Link href={href} className="text-primary hover:underline">
      {children}
    </Link>
  )
}

interface CodeProps {
  children: React.ReactNode
}

export function Code({ children }: CodeProps) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono">
      {children}
    </code>
  )
}

interface CodeBlockProps {
  language?: string
  children: React.ReactNode
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  return (
    <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
      <code className={cn("text-sm font-mono", language && `language-${language}`)}>
        {children}
      </code>
    </pre>
  )
}

interface CalloutProps {
  type?: "info" | "warning" | "error" | "success"
  title?: string
  children: React.ReactNode
}

export function Callout({ type = "info", title, children }: CalloutProps) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100",
    error: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100",
    success: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100",
  }

  const icons = {
    info: Icons.info,
    warning: Icons.warning,
    error: Icons.xCircle,
    success: Icons.checkCircle,
  }

  const Icon = icons[type]

  return (
    <div className={cn("my-4 p-4 rounded-lg border", styles[type])}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}

// Export all components for Markdoc
export const markdocComponents = {
  Heading,
  Link: LinkComponent,
  Code,
  CodeBlock,
  Callout,
}
