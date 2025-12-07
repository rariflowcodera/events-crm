"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  useWorkspaceEmailSettings,
  useUpdateWorkspaceEmailSettings,
} from "@/trpc/hooks/workspaces-hooks"

import { emailSenderSettingsSchema } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"

// ============================================================================
// Types
// ============================================================================

type WorkspaceEmailSettingsCardProps = {
  workspaceId: string
  slug: string
  canEdit: boolean
}

type FormValues = z.infer<typeof emailSenderSettingsSchema>

// ============================================================================
// Component
// ============================================================================

export function WorkspaceEmailSettingsCard({
  workspaceId,
  slug,
  canEdit,
}: WorkspaceEmailSettingsCardProps) {
  const { data, isLoading } = useWorkspaceEmailSettings(slug)
  const { mutate: updateEmailSettings, isPending } = useUpdateWorkspaceEmailSettings()

  const form = useForm<FormValues>({
    resolver: zodResolver(emailSenderSettingsSchema),
    defaultValues: {
      fromEmail: "",
      fromName: "",
    },
    values: {
      fromEmail: data?.emailSettings?.fromEmail || "",
      fromName: data?.emailSettings?.fromName || "",
    },
  })

  const onSubmit = (values: FormValues) => {
    updateEmailSettings({
      workspaceId,
      emailSettings: values,
    })
  }

  if (isLoading) {
    return <WorkspaceEmailSettingsCardSkeleton />
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="text-base">Email Sender Settings</CardTitle>
            <CardDescription>
              Configure the sender email address and display name for workspace system emails
              (invitations). Leave empty to use the system default.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fromEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="invitations@yourcompany.com"
                      disabled={!canEdit || isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The email address used as the sender for workspace invitations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your Company Events"
                      disabled={!canEdit || isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The display name shown in email clients (e.g., &quot;Company Name&quot;
                    &lt;email@company.com&gt;).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <Icons.alertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Email Deliverability</p>
                  <p className="mt-1 text-xs">
                    Ensure your email domain has proper SPF and DKIM records configured to avoid
                    emails being marked as spam.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={!canEdit || isPending || !form.formState.isDirty}>
              {isPending ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Email Settings"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

export function WorkspaceEmailSettingsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-1 h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-64" />
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Skeleton className="ml-auto h-9 w-36" />
      </CardFooter>
    </Card>
  )
}
