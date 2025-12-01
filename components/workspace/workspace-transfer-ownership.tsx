"use client"

import { useState } from "react"
import { UserType, WorkspaceType } from "@/server/db/schema-types"
import { useTransferOwnershipTRPC } from "@/trpc/hooks/workspaces-hooks"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/global/icons"
import { UserAvatar } from "@/components/global/user-avatar"

type WorkspaceTransferOwnershipProps = {
  id: WorkspaceType["id"]
  owner: Pick<UserType, "name" | "email" | "image">
}

export function WorkspaceTransferOwnership({ id, owner }: WorkspaceTransferOwnershipProps) {
  const [step, setStep] = useState<"initial" | "confirm">("initial")
  const [email, setEmail] = useState("")

  const { isPending, mutate } = useTransferOwnershipTRPC()

  const handleTransferOwnership = () => {
    mutate({ id, email })
  }

  return (
    <div className="grid grid-cols-2 gap-x-4">
      <div className="grid gap-y-1">
        <span className="text-sm font-medium">Transfer Ownership</span>
        <span className="text-muted-foreground text-sm">
          Transfer ownership of this workspace to another user.
        </span>
      </div>

      <Dialog onOpenChange={() => setStep("initial")}>
        <DialogTrigger asChild>
          <Button variant="secondary" type="button" className="ml-auto">
            Transfer Ownership
            <Icons.arrowRight />
          </Button>
        </DialogTrigger>
        <DialogContent>
          {step === "initial" ? (
            <>
              <DialogHeader>
                <DialogTitle>Transfer Workspace Ownership</DialogTitle>
                <DialogDescription>
                  Enter the email of the user you want to transfer this workspace to
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-y-4 py-4">
                <div className="grid gap-y-4">
                  <div className="flex items-center gap-x-4">
                    <UserAvatar user={owner} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm leading-none font-medium">Current Owner</p>
                      <p className="text-muted-foreground text-sm">{owner.email}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-background rounded-full p-1">
                        <Icons.arrowRight className="size-4" />
                      </div>
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter new owner's email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-4"
                    />
                  </div>
                </div>
                <Alert variant="destructive">
                  <Icons.alertTriangle className="size-4" />
                  <AlertTitle className="font-semibold">Warning</AlertTitle>
                  <AlertDescription>
                    This action cannot be undone. You will lose owner privileges and become a
                    regular member.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button onClick={() => setStep("confirm")} disabled={!email} className="w-full">
                  Continue
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Transfer</DialogTitle>
                <DialogDescription>Please review the transfer details below</DialogDescription>
              </DialogHeader>
              <div className="grid gap-y-4 py-4">
                <div className="grid gap-y-4">
                  <div className="grid gap-y-4 rounded-lg border p-4">
                    <div className="flex items-start gap-x-4">
                      <Icons.shield className="text-muted-foreground mt-0.5 size-5" />
                      <div className="space-y-1">
                        <p className="text-sm leading-none font-medium">New Owner</p>
                        <p className="text-muted-foreground text-sm">{email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-x-4">
                      <Icons.userPlus className="text-muted-foreground mt-0.5 size-5" />
                      <div className="space-y-1">
                        <p className="text-sm leading-none font-medium">Your New Role</p>
                        <p className="text-muted-foreground text-sm">
                          You will become a regular member
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col gap-y-2 sm:gap-y-0">
                <Button onClick={handleTransferOwnership} disabled={isPending} className="w-full">
                  {isPending ? (
                    <span className="flex items-center gap-x-2">
                      <Icons.loader className="size-4 animate-spin" />
                      Transferring...
                    </span>
                  ) : (
                    <span className="flex items-center gap-x-2">
                      <Icons.check className="size-4" />
                      Confirm Transfer
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep("initial")}
                  disabled={isPending}
                  className="w-full"
                >
                  Back
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
