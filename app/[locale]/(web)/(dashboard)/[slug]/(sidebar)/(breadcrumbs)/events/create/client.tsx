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
import { Switch } from "@/components/ui/switch"
import { TimePicker } from "@/components/ui/time-picker"

interface EventCreatePageClientProps {
  workspaceSlug: string
}

const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100),
  showArabicName: z.boolean().default(false),
  nameAr: z.string().max(100).optional(),
  description: z.string().optional(),
  eventType: z.string().optional(),
  venue: z.string().optional(),
  venueAddress: z.string().optional(),
  isSingleDay: z.boolean().default(false),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  rsvpDeadline: z.date().optional(),
}).refine((data) => {
  // If single day with both times, validate end time > start time
  if (data.isSingleDay && data.startTime && data.endTime) {
    return data.endTime > data.startTime
  }
  return true
}, {
  message: "End time must be after start time",
  path: ["endTime"],
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
      showArabicName: false,
      nameAr: "",
      description: "",
      eventType: "",
      venue: "",
      venueAddress: "",
      isSingleDay: false,
    },
  })

  const watchIsSingleDay = form.watch("isSingleDay")
  const watchShowArabicName = form.watch("showArabicName")

  const { mutate, isPending } = useCreateEvent({
    onSuccess: (data) => {
      router.push(createRoute("event-detail", { slug: workspaceSlug, eventSlug: data.slug }).href)
    },
  })

  const onSubmit = (values: CreateEventFormValues) => {
    mutate({
      workspaceSlug,
      name: values.name,
      nameAr: values.showArabicName && values.nameAr ? values.nameAr : undefined,
      description: values.description,
      eventType: values.eventType,
      venue: values.venue,
      venueAddress: values.venueAddress,
      isSingleDay: values.isSingleDay,
      startDate: values.startDate,
      // For single-day events, set endDate = startDate
      endDate: values.isSingleDay ? values.startDate : values.endDate,
      startTime: values.isSingleDay ? values.startTime : undefined,
      endTime: values.isSingleDay ? values.endTime : undefined,
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

          {/* Arabic Name Toggle */}
          <FormField
            control={form.control}
            name="showArabicName"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{t("fields.enableArabicName")}</FormLabel>
                  <FormDescription>
                    {t("fields.enableArabicNameDescription")}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Arabic Event Name - Only when toggle is on */}
          {watchShowArabicName && (
            <FormField
              control={form.control}
              name="nameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.nameAr")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="الحفل السنوي 2024"
                      disabled={isPending}
                      dir="rtl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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

          {/* Single Day Event Toggle */}
          <FormField
            control={form.control}
            name="isSingleDay"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{t("fields.singleDayEvent")}</FormLabel>
                  <FormDescription>
                    {t("fields.singleDayDescription")}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Dates Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date - Always visible */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{watchIsSingleDay ? t("fields.date") : t("fields.startDate")}</FormLabel>
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

            {/* End Date - Only for multi-day events */}
            {!watchIsSingleDay && (
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
            )}
          </div>

          {/* Time pickers - Only for single-day events */}
          {watchIsSingleDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("fields.startTime")}</FormLabel>
                    <FormControl>
                      <TimePicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isPending}
                        placeholder="Select start time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("fields.endTime")}</FormLabel>
                    <FormControl>
                      <TimePicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isPending}
                        placeholder="Select end time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* RSVP Deadline */}
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
