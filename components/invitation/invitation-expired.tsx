import Link from "next/link"

import { createRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"
import { InvitationWrapper } from "@/components/invitation/invitation-wrapper"

export function InvitationExpired() {
  return (
    <InvitationWrapper>
      <Icons.frown className="size-8 text-yellow-500" />
      <div className="space-y-2 text-center">
        <p className="text-2xl font-medium">Invitation expired</p>
        <span className="text-primary/60 text-sm">The invitation has expired</span>
      </div>
      <Link
        prefetch
        href={createRoute("callback").href}
        className={cn(buttonVariants({ variant: "link" }))}
      >
        Back to home
      </Link>
    </InvitationWrapper>
  )
}
