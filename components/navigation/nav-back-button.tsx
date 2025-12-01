"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"

type NavBackButtonProps = {
  slug: string
}

export function NavBackButton({ slug }: NavBackButtonProps) {
  return (
    <Link
      href={`/${slug}/dashboard`}
      prefetch
      className={cn(
        buttonVariants({ variant: "ghost", className: "text-primary/90 justify-start" })
      )}
    >
      <Icons.arrowLeft className="size-4" />
      <span>Back to dashboard</span>
    </Link>
  )
}
