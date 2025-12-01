"use client"

import { useState } from "react"
import Image from "next/image"
import { UserType, WorkspaceType } from "@/server/db/schema-types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { signIn } from "@/lib/auth-client"
import { configuration } from "@/lib/config"
import { createRoute } from "@/lib/routes"
import { userSchema } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { SignInSocialsForm } from "@/components/forms/sign-in-socials-form"
import { FormError } from "@/components/global/form-error"
import { FormSuccess } from "@/components/global/form-success"
import { Icons } from "@/components/global/icons"

type InvitationSignInProps = {
  email: UserType["email"]
  callbackUrl: string
  workspace: Pick<WorkspaceType, "name" | "logo">
}

const emailSchema = userSchema.pick({ email: true })

export function InvitationSignIn({ callbackUrl, email, workspace }: InvitationSignInProps) {
  const [showForm, setShowForm] = useState<boolean>(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [success, setSuccess] = useState<string | undefined>(undefined)

  const handleWelcomeAnimationEnd = () => {
    setShowForm(true)
  }

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: email,
    },
  })

  if (!showForm) {
    return (
      <main className="flex h-screen items-center justify-center">
        <span
          className="flex animate-[fadeIn_1.5s_ease-in] items-center gap-x-2 text-4xl font-bold"
          onAnimationEnd={handleWelcomeAnimationEnd}
        >
          Welcome, <p className="animate-fade-in-slowest opacity-0">let&apos;s join your team</p>
        </span>
      </main>
    )
  }

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values: z.infer<typeof emailSchema>) => {
    setError("")
    setSuccess("")
    try {
      const { data } = await signIn.magicLink({
        email: values.email,
        callbackURL: callbackUrl ?? createRoute("callback").href,
      })

      if (!data) {
        toast.error("Something went wrong")
        setError("Your sign in request failed. Please try again")
      }

      form.reset()
      setSuccess("We sent you a login link. Be sure to check your spam too.")
      setError("")
      toast.success("We sent your a login link", {
        description: "Be sure to check your spam too.",
      })
    } catch (error: any) {
      setError(error?.message ?? "Your sign in request failed. Please try again")
      toast.error("Something went wrong", {
        description: error?.message,
      })
    }
  }

  return (
    <main className="flex h-screen w-full items-center justify-center">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="animate-fade-in flex w-[450px] flex-col gap-y-4"
        >
          <h2 className="text-center text-sm font-semibold">{configuration.site.name}</h2>
          <div className="flex flex-col items-center gap-y-1 text-center text-base font-medium">
            <div className="flex items-center gap-x-2 text-3xl font-semibold">
              {workspace.logo ? (
                <Image src={workspace.logo} alt={workspace.name} width={32} height={32} />
              ) : (
                <div className="bg-card flex size-20 items-center justify-center rounded-md text-2xl font-semibold">
                  {workspace.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              {workspace.name}
            </div>
            <br />
            Sign in to join
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="mx-auto w-64">
                <FormLabel className="sr-only font-semibold">Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John Doe" disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="mx-auto w-64" type="submit" disabled={isLoading}>
            {isLoading ? <Icons.loader className="animate-spin" /> : null}
            Join
            <Icons.arrowRight />
          </Button>

          <Card className="mx-auto w-full max-w-64 border-none bg-transparent p-0 shadow-none">
            <SignInSocialsForm
              buttonVariant="secondary"
              className="mt-0"
              callbackUrl={callbackUrl}
            />
          </Card>

          <FormError message={error} />
          <FormSuccess message={success} />
        </form>
      </Form>
    </main>
  )
}
