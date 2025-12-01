import Link from "next/link"

import { createRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { CreateWorkspaceForm } from "@/components/forms/create-workspace-form"
import { Icons } from "@/components/global/icons"

export default function JoinPage() {
  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center">
      <header className="absolute top-0 w-full py-2">
        <Link
          href={createRoute("callback").href}
          className={cn(
            buttonVariants({ variant: "link" }),
            "top-4 left-4 flex items-center justify-start"
          )}
        >
          <span className="flex items-center gap-x-2">
            <Icons.arrowLeft className="size-4" />
            Back to Dashboard
          </span>
        </Link>
      </header>
      <CreateWorkspaceForm className="border-primary/[0.05] bg-card rounded-md border p-4" />
    </main>
  )
}
