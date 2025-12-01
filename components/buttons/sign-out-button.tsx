"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type VariantProps } from "class-variance-authority"

import { signOut } from "@/lib/auth-client"
import { Button, buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"

type SignOutButtonProps = {
  className?: string
  callbackUrl?: string
  enableIcon?: boolean
} & VariantProps<typeof buttonVariants>

export function SignOutButton({
  size,
  variant,
  className,
  callbackUrl,
  enableIcon = false,
}: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoading(true)
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push(callbackUrl ?? "/sign-in") // redirect to login page
        },
      },
    })
    router.refresh()
  }

  return (
    <Button
      size={size || "default"}
      onClick={handleSignOut}
      disabled={isLoading}
      variant={variant}
      className={className}
    >
      {enableIcon && <Icons.logout className="size-4" />}
      Sign out
    </Button>
  )
}
