"use client"

import { useState } from "react"
import { FaGithub } from "react-icons/fa6"
import { FcGoogle } from "react-icons/fc"

import { signIn } from "@/lib/auth-client"
import { createRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"

type SignInSocialsFormProps = {
  callbackUrl?: string | null
  buttonVariant?: "outline" | "secondary"
  className?: string
}

type SignInSocialsFormLoading = "google" | "github" | null

export function SignInSocialsForm({
  callbackUrl,
  buttonVariant = "outline",
  className,
}: SignInSocialsFormProps) {
  const [isLoading, setIsLoading] = useState<SignInSocialsFormLoading>(null)

  const onClick = async (type: SignInSocialsFormLoading) => {
    if (!type) return
    setIsLoading(type)

    await signIn.social({
      provider: type,
      callbackURL: callbackUrl ?? createRoute("callback").href,
    })

    setIsLoading(null)
  }

  return (
    <CardFooter className={cn("mt-5 flex flex-col gap-y-2 overflow-hidden p-0", className)}>
      <Button
        className="text-primary/80 dark:bg-os-background-100/80 w-full"
        variant={buttonVariant}
        onClick={() => onClick("google")}
        disabled={isLoading === "google"}
        type="button"
      >
        <FcGoogle className="size-5" /> Google
      </Button>
      <Button
        className="text-primary/80 dark:bg-os-background-100/80 w-full"
        variant={buttonVariant}
        size={"sm"}
        onClick={() => onClick("github")}
        disabled={isLoading === "github"}
        type="button"
      >
        <FaGithub className="size-5" /> Github
      </Button>
    </CardFooter>
  )
}
