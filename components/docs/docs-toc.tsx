"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import type { TocItem } from "@/lib/docs/types"

interface DocsTocProps {
  items: TocItem[]
}

export function DocsToc({ items }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "-80px 0px -80% 0px" }
    )

    // Collect all heading IDs
    const headingIds = items.flatMap((item) => [
      item.id,
      ...item.children.map((child) => child.id),
    ])

    // Observe all heading elements
    headingIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) {
    return null
  }

  return (
    <nav className="sticky top-20 space-y-2 text-sm">
      <p className="font-medium text-foreground mb-3">On this page</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <TocLink key={item.id} item={item} activeId={activeId} />
        ))}
      </ul>
    </nav>
  )
}

interface TocLinkProps {
  item: TocItem
  activeId: string
}

function TocLink({ item, activeId }: TocLinkProps) {
  const isActive = activeId === item.id

  return (
    <li>
      <a
        href={`#${item.id}`}
        className={cn(
          "block py-1 text-muted-foreground hover:text-foreground transition-colors",
          isActive && "text-foreground font-medium"
        )}
      >
        {item.text}
      </a>
      {item.children.length > 0 && (
        <ul className="ml-4 mt-1 space-y-1">
          {item.children.map((child) => (
            <li key={child.id}>
              <a
                href={`#${child.id}`}
                className={cn(
                  "block py-1 text-muted-foreground hover:text-foreground transition-colors text-sm",
                  activeId === child.id && "text-foreground font-medium"
                )}
              >
                {child.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
