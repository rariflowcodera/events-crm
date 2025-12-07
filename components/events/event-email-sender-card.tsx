"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { emailSenderSettingsSchema } from "@/lib/schemas"
import { useUpdateEvent } from "@/trpc/hooks/events-hooks"
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
import { Icons } from "@/components/global/icons"

// ============================================================================
// Types
// ============================================================================

interface EventEmailSenderCardProps {
  eventId: string
  emailSettings?: {
    fromEmail?: string
    fromName?: string
  } | null
}

type FormValues = z.infer<typeof emailSenderSettingsSchema>

// ============================================================================
// Component
// ============================================================================

export function EventEmailSenderCard({ eventId, emailSettings }: EventEmailSenderCardProps) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(emailSenderSettingsSchema),
    defaultValues: {
      fromEmail: emailSettings?.fromEmail || "",
      fromName: emailSettings?.fromName || "",
    },
  })

  const { mutate: updateEvent, isPending } = useUpdateEvent({
    onSuccess: () => {
      router.refresh()
      form.reset(form.getValues())
    },
  })

  const onSubmit = (values: FormValues) => {
    // Clean up empty strings
    const cleanedSettings = {
      fromEmail: values.fromEmail?.trim() || undefined,
      fromName: values.fromName?.trim() || undefined,
    }

    // If both are empty, set to undefined
    const emailSettingsToSave =
      cleanedSettings.fromEmail || cleanedSettings.fromName ? cleanedSettings : undefined

    updateEvent({
      eventId,
      settings: {
        emailSettings: emailSettingsToSave,
      },
    })
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="text-base">Default Email Sender</CardTitle>
            <CardDescription>
              Configure the default sender email address for this event&apos;s emails (invitations,
              reminders). Individual email templates can override this setting.
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
                      placeholder="events@yourcompany.com"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The email address used as the sender for event-related emails.
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
                    <Input placeholder="Event Name Team" disabled={isPending} {...field} />
                  </FormControl>
                  <FormDescription>
                    The display name shown in email clients (e.g., &quot;Event Team&quot;
                    &lt;email@company.com&gt;).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <div className="flex items-start gap-2">
                <Icons.info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Template Overrides</p>
                  <p className="mt-1 text-xs">
                    Individual email templates can specify their own sender address, which will
                    override this default setting.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={isPending || !form.formState.isDirty}>
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
