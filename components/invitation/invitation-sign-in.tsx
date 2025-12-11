"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FormError } from "@/components/global/form-error"
import { FormSuccess } from "@/components/global/form-success"
import { Icons } from "@/components/global/icons"

type InvitationSignInProps = {
  email: UserType["email"]
  callbackUrl: string
  workspace: Pick<WorkspaceType, "name" | "logo">
}

const signInSchema = z.object({
  email: userSchema.shape.email,
  password: z.string().min(1, "Password is required"),
})

type SignInFormValues = z.infer<typeof signInSchema>

export function InvitationSignIn({ callbackUrl, email, workspace }: InvitationSignInProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState<boolean>(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [success, setSuccess] = useState<string | undefined>(undefined)
  const [isPasswordMode, setIsPasswordMode] = useState<boolean>(true)
  const [isSendingMagicLink, setIsSendingMagicLink] = useState<boolean>(false)

  const handleWelcomeAnimationEnd = () => {
    setShowForm(true)
  }

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: email,
      password: "",
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

  const onSubmitPassword = async (values: SignInFormValues) => {
    setError("")
    setSuccess("")
    try {
      const { data, error: signInError } = await signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: callbackUrl ?? createRoute("callback").href,
      })

      if (signInError) {
        setError(signInError.message ?? "Invalid email or password")
        toast.error("Sign in failed", {
          description: signInError.message ?? "Invalid email or password",
        })
        return
      }

      if (data) {
        toast.success("Signed in successfully")
        router.push(callbackUrl)
      }
    } catch (error: any) {
      setError(error?.message ?? "Your sign in request failed. Please try again")
      toast.error("Something went wrong", {
        description: error?.message,
      })
    }
  }

  const onSendMagicLink = async () => {
    setError("")
    setSuccess("")
    setIsSendingMagicLink(true)
    try {
      const { data } = await signIn.magicLink({
        email: email,
        callbackURL: callbackUrl ?? createRoute("callback").href,
      })

      if (!data) {
        toast.error("Something went wrong")
        setError("Your sign in request failed. Please try again")
        return
      }

      setSuccess("We sent you a login link. Be sure to check your spam too.")
      toast.success("We sent you a login link", {
        description: "Be sure to check your spam too.",
      })
    } catch (error: any) {
      setError(error?.message ?? "Your sign in request failed. Please try again")
      toast.error("Something went wrong", {
        description: error?.message,
      })
    } finally {
      setIsSendingMagicLink(false)
    }
  }

  return (
    <main className="flex h-screen w-full items-center justify-center">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmitPassword)}
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
                <FormLabel className="font-semibold">Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="your@email.com" disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="mx-auto w-64">
                <FormLabel className="font-semibold">Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="mx-auto w-64" type="submit" disabled={isLoading}>
            {isLoading ? <Icons.loader className="animate-spin" /> : null}
            Sign in
            <Icons.arrowRight />
          </Button>

          <div className="mx-auto flex w-64 items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            className="mx-auto w-64"
            type="button"
            variant="outline"
            disabled={isSendingMagicLink}
            onClick={onSendMagicLink}
          >
            {isSendingMagicLink ? <Icons.loader className="animate-spin" /> : <Icons.mail className="mr-2 h-4 w-4" />}
            Send magic link
          </Button>

          <FormError message={error} />
          <FormSuccess message={success} />
        </form>
      </Form>
    </main>
  )
}
