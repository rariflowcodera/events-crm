"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { useUpdateEvent } from "@/trpc/hooks/events-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Icons } from "@/components/global/icons"
import { EmailConfigurationCard } from "@/components/events/email-configuration-card"

type EventStatus = "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  eventType: string | null
  venue: string | null
  venueAddress: string | null
  startDate: Date | null
  endDate: Date | null
  rsvpDeadline: Date | null
  maxGuests: number | null
  status: EventStatus
  settings: {
    allowPlusOne?: boolean
    maxPlusOnes?: number
    requireApproval?: boolean
    sendReminders?: boolean
  } | null
}

interface EventSettingsTabProps {
  event: Event
  workspaceSlug: string
}

const eventSettingsSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100),
  description: z.string().optional(),
  eventType: z.string().optional(),
  venue: z.string().optional(),
  venueAddress: z.string().optional(),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  rsvpDeadline: z.date().nullable().optional(),
  maxGuests: z.number().int().positive().nullable().optional(),
  status: z.enum([
    "draft",
    "planning",
    "invitations_sent",
    "rsvp_open",
    "rsvp_closed",
    "in_progress",
    "completed",
    "cancelled",
  ]),
  settings: z.object({
    allowPlusOne: z.boolean().optional(),
    maxPlusOnes: z.number().optional(),
    requireApproval: z.boolean().optional(),
    sendReminders: z.boolean().optional(),
  }).optional(),
})

type EventSettingsFormValues = z.infer<typeof eventSettingsSchema>

const statusOptions: { value: EventStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "planning", label: "Planning" },
  { value: "invitations_sent", label: "Invitations Sent" },
  { value: "rsvp_open", label: "RSVP Open" },
  { value: "rsvp_closed", label: "RSVP Closed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export function EventSettingsTab({ event, workspaceSlug }: EventSettingsTabProps) {
  const t = useTranslations("event")
  const router = useRouter()

  const form = useForm<EventSettingsFormValues>({
    resolver: zodResolver(eventSettingsSchema),
    defaultValues: {
      name: event.name,
      description: event.description || "",
      eventType: event.eventType || "",
      venue: event.venue || "",
      venueAddress: event.venueAddress || "",
      startDate: event.startDate ? new Date(event.startDate) : null,
      endDate: event.endDate ? new Date(event.endDate) : null,
      rsvpDeadline: event.rsvpDeadline ? new Date(event.rsvpDeadline) : null,
      maxGuests: event.maxGuests,
      status: event.status,
      settings: {
        allowPlusOne: event.settings?.allowPlusOne ?? false,
        maxPlusOnes: event.settings?.maxPlusOnes ?? 1,
        requireApproval: event.settings?.requireApproval ?? false,
        sendReminders: event.settings?.sendReminders ?? true,
      },
    },
  })

  const { mutate, isPending } = useUpdateEvent({
    onSuccess: () => {
      router.refresh()
    },
  })

  const onSubmit = (values: EventSettingsFormValues) => {
    mutate({
      eventId: event.id,
      ...values,
    })
  }

  const isLoading = form.formState.isSubmitting || isPending
  const isDirty = form.formState.isDirty

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update the basic details of your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.name")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.eventType")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Conference, Gala, Summit..."
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your event..."
                      disabled={isLoading}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Where is your event taking place?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.venue")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Riyadh Convention Center"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venueAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.venueAddress")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Full address..."
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Dates & Deadlines</CardTitle>
            <CardDescription>When is your event happening?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("fields.startDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Icons.calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("fields.endDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Icons.calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rsvpDeadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("fields.rsvpDeadline")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal sm:w-1/2",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a deadline</span>
                          )}
                          <Icons.calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Guests will not be able to respond after this date.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.maxGuests")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="No limit"
                      disabled={isLoading}
                      className="sm:w-1/2"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value ? parseInt(value) : null)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty for no limit on guest count.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* RSVP Settings */}
        <Card>
          <CardHeader>
            <CardTitle>RSVP Settings</CardTitle>
            <CardDescription>Configure how guests can respond</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="settings.allowPlusOne"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Allow Plus Ones</FormLabel>
                    <FormDescription>
                      Let guests bring companions to the event
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.requireApproval"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Require Approval</FormLabel>
                    <FormDescription>
                      Manually approve guest confirmations before they are finalized
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.sendReminders"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Send Reminders</FormLabel>
                    <FormDescription>
                      Automatically send reminder emails to pending guests
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !isDirty}>
            {isLoading && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>

      {/* Email Configuration - separate from form since it has its own mutations */}
      <div className="mt-6">
        <EmailConfigurationCard
          eventId={event.id}
          eventSlug={event.slug}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </Form>
  )
}
