import Image from "next/image"

import { configuration } from "@/lib/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SignOutButton } from "@/components/buttons/sign-out-button"
import { Icons } from "@/components/global/icons"

export default function AccessDeniedPage() {
  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <Image
            src={"/logo.svg"}
            alt={`${configuration.site.name} Logo`}
            width={45}
            height={45}
            className="mx-auto mb-2"
          />
          <CardTitle className="flex items-center justify-center gap-2 text-lg">
            <Icons.lock className="size-5 text-red-500" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You don&apos;t have access to any workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center text-sm">
            Please contact your administrator to request access or to be invited to a workspace.
          </p>
          <div className="flex justify-center">
            <SignOutButton variant="outline" enableIcon />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
