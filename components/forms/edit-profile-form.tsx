"use client"

import { useEffect, useState } from "react"
import { trpc } from "@/trpc/client"
import { useInitialEmailChangeTRPC, useUpdateUserTRPC } from "@/trpc/hooks/users-hooks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { userSchema } from "@/lib/schemas"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert } from "@/components/global/alert"
import { Icons } from "@/components/global/icons"

type EditProfileFormProps = {
  isOpen: boolean
}

export function EditProfileForm({ isOpen }: EditProfileFormProps) {
  const { data, isLoading: isFetching } = trpc.users.getOne.useQuery(undefined, {
    enabled: isOpen,
    retry: false,
  })

  const [initialEmailMessage, setInitialEmailMessage] = useState<string | null>(null)

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: data?.user?.name || undefined,
      lastName: data?.user?.lastName || undefined,
      email: data?.user?.email || "",
      id: data?.user?.id || "",
    },
  })

  useEffect(() => {
    if (data?.user) {
      form.reset({
        name: data.user.name || undefined,
        lastName: data.user.lastName || undefined,
        email: data.user.email,
        id: data.user.id,
      })
    }
  }, [data, form])

  const { isPending: isUpdatingUser, mutate: updateUser } = useUpdateUserTRPC({
    onSuccess: () => form.reset(form.getValues()),
  })

  const { isPending: isPendingInitialEmailChange, mutate: initialEmailChange } =
    useInitialEmailChangeTRPC({
      setError: (error) => setInitialEmailMessage(error),
      setSuccess: (success) => setInitialEmailMessage(success),
    })

  if (isFetching) {
    return (
      <div className="flex items-center justify-center">
        <Icons.loader className="size-5 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return <div>No data</div>
  }

  const { account, email } = data.user

  const isDirty = form.formState.isDirty

  const onSubmit = async (values: z.infer<typeof userSchema>) => {
    if (!isDirty) {
      return toast.info("No changes to update")
    }

    // Handle email change separately
    if (values.email && values.email !== email) {
      return initialEmailChange({ email: values.email })
    }

    updateUser(values)
  }

  const isLoading = form.formState.isSubmitting || isUpdatingUser || isPendingInitialEmailChange
  const isThirdPartyProvider = !!account?.provider

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl>
                <Input disabled={isLoading} {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl>
                <Input disabled={isLoading} {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input disabled={isThirdPartyProvider || isPendingInitialEmailChange} {...field} />
              </FormControl>
              <FormMessage />
              {initialEmailMessage && (
                <span
                  className={cn("flex items-center text-sm text-green-500", {
                    "text-destructive": !!initialEmailMessage,
                  })}
                >
                  <Icons.check className="mr-2 size-4" />
                  {initialEmailMessage}
                </span>
              )}
            </FormItem>
          )}
        />

        {isThirdPartyProvider && (
          <Alert
            icon="info"
            title="You are using a third-party provider to sign in and can't change your email"
          />
        )}

        <CardFooter className="w-full items-end justify-end p-0 pt-6">
          <Button type="submit" disabled={isLoading}>
            Update
          </Button>
        </CardFooter>
      </form>
    </Form>
  )
}
