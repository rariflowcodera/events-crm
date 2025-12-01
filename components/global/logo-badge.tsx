import Image from "next/image"
import { WorkspaceType } from "@/server/db/schema-types"

import { configuration } from "@/lib/config"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type LogoBadgeProps = {
  value: {
    logo?: WorkspaceType["logo"]
    name: WorkspaceType["name"]
  }
  className?: string
  hideText?: boolean
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
  maxChars?: 10 | 15 | 20 | 25
  fontWeight?: "normal" | "semibold" | "bold"
  doubleLetter?: boolean
  borderRadius?: "sm" | "md"
}

export function LogoBadge({
  value: { name, logo },
  className,
  hideText = false,
  size = "sm",
  maxChars = 20,
  fontWeight = "normal",
  doubleLetter = false,
  borderRadius = "md",
}: LogoBadgeProps) {
  return (
    <div className={cn("flex items-center gap-x-2", className)}>
      <div
        className={cn(
          "relative flex size-5 items-center justify-center overflow-hidden bg-transparent uppercase",
          {
            "size-5": size === "sm",
            "size-[25px]": size === "md",
            "size-7 group-data-[collapsible=icon]:size-[2rem]": size === "lg",
            "size-[2rem] group-data-[collapsible=icon]:size-[1.9rem]": size === "xl",
            "size-[2.25rem] group-data-[collapsible=icon]:size-[1.9rem]": size === "2xl",
            "size-[3rem]": size === "3xl",
            "rounded-sm": borderRadius === "sm",
            "rounded-md": borderRadius === "md",
          }
        )}
      >
        {logo ? (
          <Image
            width={75}
            height={75}
            className={cn("object-contain", {
              "rounded-sm": borderRadius === "sm",
              "rounded-md": borderRadius === "md",
            })}
            src={logo}
            alt={`${configuration.site.name} Logo`}
          />
        ) : (
          <div className="bg-muted dark:bg-card flex size-full items-center justify-center rounded-md font-semibold uppercase select-none">
            <span className="visible group-data-[collapsible=icon]:hidden">
              {doubleLetter ? name.slice(0, 2) : name[0]}
            </span>
            <span className="hidden group-data-[collapsible=icon]:block">{name[0]}</span>
          </div>
        )}
      </div>
      {!hideText ? (
        <span
          className={cn("truncate text-sm font-normal capitalize", {
            "max-w-[10ch]": maxChars === 10,
            "max-w-[15ch]": maxChars === 15,
            "max-w-[20ch]": maxChars === 20,
            "max-w-[25ch]": maxChars === 25,
            "font-semibold": fontWeight === "semibold",
            "font-bold": fontWeight === "bold",
          })}
        >
          {name}
        </span>
      ) : null}
    </div>
  )
}
type LogoBadgeSkeletonProps = {
  hideText?: boolean
}

export function LogoBadgeSkeleton({ hideText = false }: LogoBadgeSkeletonProps) {
  return (
    <div className="flex items-center gap-x-2">
      <Skeleton className="size-7" />
      {!hideText ? <Skeleton className="h-4 w-24" /> : null}
    </div>
  )
}
