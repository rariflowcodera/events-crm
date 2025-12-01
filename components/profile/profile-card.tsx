"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/trpc/client"
import { ErrorBoundary } from "react-error-boundary"
import { toast } from "sonner"

import { SessionType } from "@/types/types"
import { authClient, signOut } from "@/lib/auth-client"
import { parseUserAgent } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SignOutButton } from "@/components/buttons/sign-out-button"
import { EditProfileImageForm } from "@/components/forms/edit-profile-image-form"
import { Alert } from "@/components/global/alert"
import { Icons } from "@/components/global/icons"
import { ImageUploadSkeleton } from "@/components/global/image-upload"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"
import { ProfileSwitcher } from "@/components/profile/profile-switcher"

export function ProfileCard() {
  return (
    <Suspense fallback={<ProfileCardSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={error.message || "An error occurred"}
            icon="alertTriangle"
          />
        )}
      >
        <ProfileCardSuspense />
      </ErrorBoundary>
    </Suspense>
  )
}

function ProfileCardSuspense() {
  const [data] = trpc.users.getOne.useSuspenseQuery()
  const { user, sessions, sessionId, deviceSessions } = data

  const [isTerminating, setIsTerminating] = useState<string>()
  const router = useRouter()
  const utils = trpc.useUtils()

  const terminateSession = async (session: SessionType["session"]) => {
    setIsTerminating(session.id)

    if (sessionId === session.id) {
      return await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/sign-in")
          },
        },
      })
    }

    const res = await authClient.revokeSession({
      token: session.token,
    })

    if (res.error) {
      toast.error(res.error.message)
    } else {
      toast.success("Session terminated successfully")
    }

    router.refresh()
    utils.users.getOne.invalidate()

    setIsTerminating(undefined)
  }

  return (
    <>
      <ProfileSwitcher sessions={deviceSessions} />
      <SettingsWrapperCard>
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-semibold">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <EditProfileImageForm user={user} />

          <div className="flex w-max flex-col gap-1 border-l-2 px-2">
            <p className="text-muted-foreground text-xs font-medium">Active Sessions</p>
            {sessions
              .filter((session) => session.userAgent)
              .map((session) => {
                return (
                  <div key={session.id}>
                    <div className="text-primary/80 flex items-center gap-2 text-sm font-medium capitalize">
                      {parseUserAgent(session.userAgent || "").deviceType === "mobile" ? (
                        <Icons.phone className="size-4" />
                      ) : (
                        <Icons.laptop className="size-4" />
                      )}
                      {parseUserAgent(session.userAgent || "").os},{" "}
                      {parseUserAgent(session.userAgent || "").browser}
                      <Button
                        variant={"link"}
                        size={"sm"}
                        className="p-0 text-xs text-red-500 underline opacity-80"
                        onClick={() => terminateSession(session)}
                      >
                        {isTerminating === session.id ? (
                          <Icons.loader className="loader-2 animate-spin" />
                        ) : session.id === sessionId ? (
                          "Sign Out"
                        ) : (
                          "Terminate"
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-y py-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm">Passkeys</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled variant={"outline"}>
                  <Icons.plus />
                  Add New Passkey
                </Button>
                <Button disabled variant={"outline"}>
                  <Icons.fingerprint />
                  Passkeys
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm">Two Factor</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled variant={"outline"}>
                  <Icons.shield />
                  Enable 2FA
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <SignOutButton variant={"secondary"} enableIcon />
        </CardFooter>
      </SettingsWrapperCard>
    </>
  )
}

function ProfileCardSkeleton() {
  return (
    <SettingsWrapperCard>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-semibold">Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-x-2">
            <div className="flex items-center gap-x-2">
              <ImageUploadSkeleton rounded="full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex w-max flex-col gap-1 border-l-2 px-2">
            <p className="text-muted-foreground text-xs font-medium">Active Sessions</p>
            <div className="text-primary/80 flex items-center gap-2 text-sm font-medium capitalize">
              <Skeleton className="size-4" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="text-primary/80 flex items-center gap-2 text-sm font-medium capitalize">
              <Skeleton className="size-4" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="text-primary/80 flex items-center gap-2 text-sm font-medium capitalize">
              <Skeleton className="size-4" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="items-end justify-between">
        <Skeleton className="ml-auto h-10 w-32" />
      </CardFooter>
    </SettingsWrapperCard>
  )
}
