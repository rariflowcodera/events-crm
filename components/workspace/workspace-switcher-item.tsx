"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { WorkspaceType } from "@/server/db/schema-types"
import { Check } from "lucide-react"

import { cn, isRouteActive } from "@/lib/utils"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LogoBadge } from "@/components/global/logo-badge"

type WorkspaceSwitcherItemProps = {
  item: WorkspaceType | null
  status?: "active" | "inactive"
}

export function WorkspaceSwitcherItem({
  item,
  status = "active",
}: WorkspaceSwitcherItemProps) {
  const pathname = usePathname()

  if (!item) return null

  // Get the current path segments and replace the slug
  const workspacePath = pathname
    .split("/")
    .map((segment, i) => (i === 1 ? item.slug : segment))
    .join("/")

  const isActive = isRouteActive(workspacePath, pathname, 1)

  return (
    <Link
      href={status === "active" ? workspacePath : ""}
      className={cn("", {
        "cursor-default": status === "inactive",
      })}
    >
      <DropdownMenuItem
        className={cn("cursor-pointer justify-between", {
          "bg-accent/50": isActive,
          "cursor-default": status === "inactive",
        })}
        disabled={status === "inactive"}
      >
        <LogoBadge size="md" value={item} maxChars={15} borderRadius="sm" />
        {isActive ? <Check className="text-primary size-4" /> : null}
      </DropdownMenuItem>
    </Link>
  )
}
