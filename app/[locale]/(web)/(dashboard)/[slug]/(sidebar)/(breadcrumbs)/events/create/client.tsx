"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { createRoute } from "@/lib/routes"
import { useCreateEvent } from "@/trpc/hooks/events-hooks"
import { PagePanel } from "@/components/global/page-panel"
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
import { Icons } from "@/components/global/icons"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface EventCreatePageClientProps {
  workspaceSlug: string
}

const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100),
  description: z.string().optional(),
  eventType: z.string().optional(),
  venue: z.string().optional(),
  venueAddress: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  rsvpDeadline: z.date().optional(),
})

type CreateEventFormValues = z.infer<typeof createEventSchema>

export function EventCreatePageClient({ workspaceSlug }: EventCreatePageClientProps) {
  const t = useTranslations("event")
  const router = useRouter()

  // Fallback URL for back navigation
  const backHref = createRoute("events", { slug: workspaceSlug }).href

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: "",
      description: "",
      eventType: "",
      venue: "",
      venueAddress: "",
    },
  })

  const { mutate, isPending } = useCreateEvent({
    onSuccess: (data) => {
      router.push(createRoute("event-detail", { slug: workspaceSlug, eventSlug: data.slug }).href)
    },
  })

  const onSubmit = (values: CreateEventFormValues) => {
    mutate({
      workspaceSlug,
      name: values.name,
      description: values.description,
      eventType: values.eventType,
      venue: values.venue,
      venueAddress: values.venueAddress,
      startDate: values.startDate,
      endDate: values.endDate,
      rsvpDeadline: values.rsvpDeadline,
    })
  }

  return (
    <PagePanel
      title={t("create")}
      description="Create a new event for your workspace"
      backHref={backHref}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Event Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.name")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Annual Gala 2024"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This will be used to generate the event URL
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.description")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your event..."
                    disabled={isPending}
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Event Type */}
          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Type</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Conference, Gala, Summit..."
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Venue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.venue")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Convention Center"
                      disabled={isPending}
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
                  <FormLabel>Venue Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St, Riyadh"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isPending}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
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
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isPending}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
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
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isPending}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
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

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
              Create Event
            </Button>
          </div>
        </form>
      </Form>
    </PagePanel>
  )
}
