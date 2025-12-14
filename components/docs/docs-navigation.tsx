"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment, useState } from "react"

import { cn } from "@/lib/utils"
import type { DocNavItem } from "@/lib/docs/types"
import { Icons } from "@/components/global/icons"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface DocsNavigationProps {
  tree: DocNavItem[]
  slug: string
}

export function DocsNavigation({ tree, slug }: DocsNavigationProps) {
  return (
    <ScrollArea className="h-full py-4">
      <nav className="space-y-1 px-2">
        <Tree items={tree} slug={slug} level={0} />
      </nav>
    </ScrollArea>
  )
}

interface TreeProps {
  items: DocNavItem[]
  slug: string
  level: number
}

function Tree({ items, slug, level }: TreeProps) {
  return (
    <>
      {items.map((item) => (
        <TreeNode key={item.slug} item={item} slug={slug} level={level} />
      ))}
    </>
  )
}

interface TreeNodeProps {
  item: DocNavItem
  slug: string
  level: number
}

function TreeNode({ item, slug, level }: TreeNodeProps) {
  const pathname = usePathname()
  const href = `/${slug}/docs/${item.slug}`
  const isActive = pathname === href || pathname.startsWith(`${href}/`)
  const hasChildren = item.children.length > 0
  const [isOpen, setIsOpen] = useState(!item.frontmatter.collapsed || isActive)

  const linkClasses = cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
    "hover:bg-accent hover:text-accent-foreground",
    isActive && !hasChildren && "bg-accent text-accent-foreground font-medium",
    level > 0 && "ml-4"
  )

  if (item.frontmatter.collapsible && hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center">
          <Link href={href} className={cn(linkClasses, "flex-1")}>
            {item.frontmatter.title}
          </Link>
          <CollapsibleTrigger className="p-2 hover:bg-accent rounded-md transition-colors">
            <Icons.chevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="mt-1">
            <Tree items={item.children} slug={slug} level={level + 1} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Fragment>
      <Link href={href} className={linkClasses}>
        {item.frontmatter.title}
      </Link>
      {hasChildren && (
        <div className="mt-1">
          <Tree items={item.children} slug={slug} level={level + 1} />
        </div>
      )}
    </Fragment>
  )
}
