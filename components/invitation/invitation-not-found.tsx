import Link from "next/link"

import { createRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"
import { InvitationWrapper } from "@/components/invitation/invitation-wrapper"

export function InvitationNotFound() {
  return (
    <InvitationWrapper>
      <Icons.alertTriangle className="size-14 text-red-500" />
      <div className="text-center">
        <p className="text-xl font-medium">We could not find an invitation for you</p>
        <p>Invitation must have been expired</p>
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
