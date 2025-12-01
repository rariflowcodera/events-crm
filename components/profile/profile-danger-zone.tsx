"use client"

import { Suspense, useState } from "react"
import { trpc } from "@/trpc/client"
import { useDeleteUserTRPC } from "@/trpc/hooks/users-hooks"
import { format } from "date-fns"
import { ErrorBoundary } from "react-error-boundary"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert } from "@/components/global/alert"
import { Icons } from "@/components/global/icons"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"

export function ProfileDangerZone() {
  return (
    <Suspense fallback={<ProfileDangerZoneSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={error.message || "An error occurred"}
            icon="alertTriangle"
          />
        )}
      >
        <ProfileDangerZoneSuspense />
      </ErrorBoundary>
    </Suspense>
  )
}

function ProfileDangerZoneSuspense() {
  const [data] = trpc.users.getOne.useSuspenseQuery()

  const { email, createdAt, id } = data.user

  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false)
  const [confirmText, setConfirmText] = useState<string>("")
  const [showError, setShowError] = useState<boolean>(false)

  const { isPending, mutate: deleteUser } = useDeleteUserTRPC()

  const handleDeleteUser = () => {
    deleteUser({ id })
  }

  const isConfirmed = confirmText.toLowerCase() === "confirm delete"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isConfirmed) {
      handleDeleteUser()
    } else {
      setShowError(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmText(e.target.value)
    setShowError(false)
  }

  return (
    <SettingsWrapperCard type="destructive">
      <CardHeader className="grid gap-y-1">
        <CardTitle className="text-lg font-medium">Delete profile</CardTitle>
        <CardDescription className="text-sm">
          The account will be permanently deleted, including its workspaces and data.
          <br />
          This action is irreversible and can not be undone.
        </CardDescription>
        <Separator className="bg-secondary-foreground/30" />
      </CardHeader>
      <CardContent className="flex flex-col gap-y-2">
        <span className="text-sm font-semibold">{email}</span>
        <span className="text-muted-foreground text-xs">
          Account created on {format(createdAt, "PPP")}
        </span>
      </CardContent>

      <CardFooter className="bg-destructive/10 px-6 py-3">
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" type="button" className="ml-auto w-fit">
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground space-y-4 text-sm">
                By proceeding to deleting this User, you&apos;re permanently removing your data from
                the system.
              </AlertDialogDescription>
              <form onSubmit={handleSubmit}>
                <span className="mt-4 flex flex-col gap-y-1">
                  <span className="text-muted-foreground mb-2 text-sm">
                    Please type <span className="text-primary font-bold">Confirm delete</span> to
                    confirm.
                  </span>
                  <Input
                    autoFocus
                    value={confirmText}
                    onChange={handleInputChange}
                    placeholder="Confirm delete"
                    className="w-full font-medium"
                  />
                  {showError && (
                    <span className="mt-2 text-sm text-red-500">
                      Please type <span className="font-bold text-red-500">Confirm delete</span>{" "}
                      exactly to proceed
                    </span>
                  )}
                </span>
              </form>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isPending || !isConfirmed}
                className="bg-destructive dark:bg-destructive/20 hover:bg-destructive gap-x-2 dark:text-red-500"
              >
                {isPending ? (
                  <>
                    <Icons.loader className="size-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </SettingsWrapperCard>
  )
}

function ProfileDangerZoneSkeleton() {
  return (
    <SettingsWrapperCard type="destructive">
      <CardHeader className="grid gap-y-1">
        <CardTitle className="text-lg font-medium">Delete profile</CardTitle>
        <CardDescription className="text-sm">
          The account will be permanently deleted, including its workspaces and data.
          <br />
          This action is irreversible and can not be undone.
        </CardDescription>
        <Separator className="bg-secondary-foreground/30" />
      </CardHeader>

      <CardContent className="flex flex-col gap-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </CardContent>

      <CardFooter className="bg-destructive/10 px-6 py-3">
        <Skeleton className="ml-auto h-8 w-24" />
      </CardFooter>
    </SettingsWrapperCard>
  )
}
