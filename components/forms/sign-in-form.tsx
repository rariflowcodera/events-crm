"use client"

import { ComponentProps, useState } from "react"
import Image from "next/image"
import { RedirectType, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { signIn } from "@/lib/auth-client"
import { configuration } from "@/lib/config"
import { createRoute, redirectToRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/global/icons"

type SignInFormProps = ComponentProps<typeof Card> & {
  isLoggedIn: boolean
}

export function SignInForm({ className, isLoggedIn, ...props }: SignInFormProps) {
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")
  const extraSession = searchParams.get("extraSession")

  const signInSchema = z.object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .min(3, { message: "Email must be at least 3 characters" })
      .email("Invalid email address")
      .toLowerCase(),
  })

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "" },
  })

  if (isLoggedIn && !extraSession) {
    return redirectToRoute("callback", undefined, RedirectType.replace)
  }

  const urlError =
    searchParams.get("error") === "OAuthAccountNotLinked"
      ? "Email already in use with different provider!"
      : ""

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values: z.infer<typeof signInSchema>) => {
    setError("")
    setSuccess("")
    try {
      const { data, error: signInError } = await signIn.magicLink({
        email: values.email,
        callbackURL: callbackUrl ?? createRoute("callback").href,
      })

      if (signInError) {
        setError(signInError.message ?? "Your sign in request failed. Please try again")
        return toast.error("Sign in failed", { description: signInError.message })
      }

      if (!data) {
        setError("Your sign in request failed. Please try again")
        return toast.error("Something went wrong")
      }

      // Success - show message to check email
      setSuccess("Check your email for a magic link to sign in")
      toast.success("Magic link sent!", { description: "Check your email to sign in" })
    } catch (error: any) {
      setError(error?.message ?? "Your sign in request failed. Please try again")
      toast.error("Something went wrong", { description: error?.message })
    }
  }

  const errorMessage = urlError ? urlError : error

  return (
    <div className="w-full">
      <Image
        src={"/logo.png"}
        alt={`${configuration.site.name} Logo`}
        width={400}
        height={249}
        className="mx-auto mb-4 h-auto max-w-xs"
      />
      <h1 className="mb-8 text-center text-2xl font-bold">Events CRM</h1>
      <Card className={cn("mx-auto w-full md:w-[400px]", className)} {...props}>
        <CardHeader>
          <CardTitle className="text-lg">Sign in</CardTitle>
          <CardDescription>{configuration.site.shortDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid w-full gap-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            disabled={isLoading}
                            placeholder="Enter your email"
                            type="email"
                            required
                            className="peer ps-9"
                            id="email"
                            autoComplete="email"
                          />

                          <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                            <Icons.mail size={16} strokeWidth={2} aria-hidden="true" />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Icons.loader className="animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    "Sign in with magic link"
                  )}
                </Button>
                {errorMessage ? (
                  <div className="flex items-center gap-x-2 rounded-md bg-red-500/10 p-3 text-sm font-medium text-red-600">
                    <Icons.alertTriangle className="size-4" />
                    <p>{errorMessage}</p>
                  </div>
                ) : null}

                {success ? (
                  <div className="flex items-center gap-x-2 rounded-md bg-green-500/10 p-3 text-sm font-medium text-green-600 dark:bg-green-400/10 dark:text-green-500">
                    <Icons.checkCircle className="size-4" />
                    <p>{success}</p>
                  </div>
                ) : null}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
