import { ReactNode } from "react"
import Link from "next/link"

import { configuration } from "@/lib/config"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"

type AuthLayoutProps = {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="bg-os-background-100 flex h-screen min-h-screen flex-col items-center justify-center px-6 py-12 md:px-0">
      <header className="w-full">
        <Link
          href={"/"}
          className={cn(
            buttonVariants({ variant: "link" }),
            "absolute top-4 left-4 flex items-center"
          )}
        >
          <span className="flex items-center gap-x-2">
            <Icons.arrowLeft className="size-4" />
            Back to home
          </span>
        </Link>
      </header>
      {children}
    </main>
  )
}
