import React from "react"
import Link from "next/link"

import { configuration } from "@/lib/config"
import { createRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { EmptyPlaceholder } from "@/components/global/empty-placeholder"

type RestrictedContentProps = {
  title?: string
  description?: string
  className?: string
  ctaText?: string
  cta?: React.ReactNode
}

export function RestrictedContent({
  title,
  description,
  className,
  ctaText = "Go back to App",
  cta,
}: RestrictedContentProps) {
  return (
    <div className={cn("relative flex h-screen flex-col justify-center", className)}>
      <EmptyPlaceholder className="mx-auto max-w-[800px]">
        <EmptyPlaceholder.Icon name="warning" />
        <EmptyPlaceholder.Title>
          {title ? title : "Uh oh! This content is restricted"}
        </EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {description ? description : "You do not have permission to view this content."}
        </EmptyPlaceholder.Description>
        {cta ? (
          cta
        ) : (
          <Link
            href={createRoute("callback").href}
            className={buttonVariants({ variant: "ghost" })}
          >
            {ctaText}
          </Link>
        )}
      </EmptyPlaceholder>

      <div className="fixed inset-x-0 bottom-0 w-full py-4">
        <div className="text-muted-foreground flex items-center justify-center text-sm">
          {configuration.site.name}
        </div>
      </div>
    </div>
  )
}
