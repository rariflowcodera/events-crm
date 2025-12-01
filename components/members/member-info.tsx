import { InvitationType } from "@/server/db/schema-types"
import { format, formatDistanceToNow } from "date-fns"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Icons } from "@/components/global/icons"

type MemberInfoProps = {
  email: string
  name?: string
  isCurrentUser?: boolean
  tokenExpiresAt?: InvitationType["expiresAt"]
  createdAt?: InvitationType["createdAt"]
  isExpired?: boolean
  isRejected?: boolean
}

export function MemberInfo({
  email,
  name,
  isCurrentUser,
  tokenExpiresAt,
  createdAt,
  isExpired,
  isRejected = false,
}: MemberInfoProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold">
        {name}
        {isCurrentUser && <span className="ml-1 font-normal">(you)</span>}
      </p>
      <div className="grid gap-0">
        <p className="text-primary/80 text-[12px]">{email}</p>
        {createdAt && (
          <div
            className={cn("text-muted-foreground/70 flex items-center gap-x-2 text-[11px]", {
              "text-destructive": isExpired,
            })}
          >
            Invited on: {format(new Date(createdAt), "MMM dd, yyyy")}
            <Separator orientation="vertical" className="h-2" />
            {tokenExpiresAt && !isRejected && (
              <span
                className={cn("text-muted-foreground/70 flex items-center text-[11px]", {
                  "text-destructive": isExpired,
                })}
              >
                <Icons.clock
                  className={cn("mx-1 mb-0.5 size-3", {
                    "text-destructive": isExpired,
                  })}
                />
                {isExpired ? "Expired" : "Expires in"}
                <p className="ml-1 font-semibold">
                  {formatDistanceToNow(new Date(tokenExpiresAt), { addSuffix: true })}
                </p>
              </span>
            )}
            {isRejected && <span className="text-destructive">Rejected</span>}
          </div>
        )}
      </div>
    </div>
  )
}
