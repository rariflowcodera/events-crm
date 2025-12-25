"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { useUpdateEvent } from "@/trpc/hooks/events-hooks"
import { useGenerateSerialNumbers, useBackfillShortCodes } from "@/trpc/hooks/guests-hooks"
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
import { TimePicker } from "@/components/ui/time-picker"
import { Icons } from "@/components/global/icons"
import { PlaceAutocompleteInput, type PlaceResult } from "@/components/forms/place-autocomplete-input"
import { LocationPreview } from "@/components/events/location-preview"
import { EmailConfigurationCard } from "@/components/events/email-configuration-card"
import { EventCustomDomainCard } from "@/components/events/event-custom-domain-card"
import { EventEmailSenderCard } from "@/components/events/event-email-sender-card"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"

type EventStatus = "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"

interface Event {
  id: string
  name: string
  nameAr: string | null
  slug: string
  description: string | null
  eventType: string | null
  venue: string | null
  venueAddress: string | null
  // Location coordinates from Google Places
  latitude: string | null
  longitude: string | null
  placeId: string | null
  city: string | null
  country: string | null
  startDate: Date | null
  endDate: Date | null
  startTime: string | null
  endTime: string | null
  isSingleDay: boolean | null
  rsvpDeadline: Date | null
  maxGuests: number | null
  status: EventStatus
  settings: {
    allowPlusOne?: boolean
    maxPlusOnes?: number
    requireApproval?: boolean
    sendReminders?: boolean
    autoAcknowledgementEmails?: boolean
    emailSettings?: {
      fromEmail?: string
      fromName?: string
    }
    vapp?: {
      enabled?: boolean
      venueCode?: string
      matchCode?: string
      nextSequence?: number
    }
  } | null
  // Custom domain fields
  customDomain: string | null
  customDomainVerified: boolean | null
  customDomainVerificationToken: string | null
}

interface EventSettingsTabProps {
  event: Event
  workspaceSlug: string
}

const eventSettingsSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100),
  showArabicName: z.boolean().default(false),
  nameAr: z.string().max(100).nullable().optional(),
  description: z.string().optional(),
  eventType: z.string().optional(),
  venue: z.string().optional(),
  venueAddress: z.string().optional(),
  // Location coordinates from Google Places
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  placeId: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  isSingleDay: z.boolean().default(false),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
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
    autoAcknowledgementEmails: z.boolean().optional(),
    vapp: z.object({
      enabled: z.boolean().optional(),
      venueCode: z.string().max(10).optional(),
      matchCode: z.string().max(10).optional(),
    }).optional(),
  }).optional(),
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
  const { can } = usePermissions(workspaceSlug)
  const canEdit = can(PERMISSIONS.MANAGE_EVENT)

  const form = useForm<EventSettingsFormValues>({
    resolver: zodResolver(eventSettingsSchema),
    defaultValues: {
      name: event.name,
      showArabicName: !!event.nameAr,
      nameAr: event.nameAr || "",
      description: event.description || "",
      eventType: event.eventType || "",
      venue: event.venue || "",
      venueAddress: event.venueAddress || "",
      latitude: event.latitude || null,
      longitude: event.longitude || null,
      placeId: event.placeId || null,
      city: event.city || null,
      country: event.country || null,
      isSingleDay: event.isSingleDay ?? false,
      startDate: event.startDate ? new Date(event.startDate) : null,
      endDate: event.endDate ? new Date(event.endDate) : null,
      startTime: event.startTime || null,
      endTime: event.endTime || null,
      rsvpDeadline: event.rsvpDeadline ? new Date(event.rsvpDeadline) : null,
      maxGuests: event.maxGuests,
      status: event.status,
      settings: {
        allowPlusOne: event.settings?.allowPlusOne ?? false,
        maxPlusOnes: event.settings?.maxPlusOnes ?? 1,
        requireApproval: event.settings?.requireApproval ?? false,
        sendReminders: event.settings?.sendReminders ?? true,
        autoAcknowledgementEmails: event.settings?.autoAcknowledgementEmails ?? true,
        vapp: {
          enabled: event.settings?.vapp?.enabled ?? false,
          venueCode: event.settings?.vapp?.venueCode ?? "",
          matchCode: event.settings?.vapp?.matchCode ?? "",
        },
      },
    },
  })

  const watchIsSingleDay = form.watch("isSingleDay")
  const watchShowArabicName = form.watch("showArabicName")

  const { mutate, isPending } = useUpdateEvent({
    onSuccess: () => {
      router.refresh()
    },
  })

  const { mutate: generateSerials, isPending: isGenerating } = useGenerateSerialNumbers()
  const { mutate: backfillShortCodes, isPending: isBackfilling } = useBackfillShortCodes()

  const onSubmit = (values: EventSettingsFormValues) => {
    mutate({
      eventId: event.id,
      ...values,
      // Set nameAr only if toggle is on, otherwise clear it
      nameAr: values.showArabicName && values.nameAr ? values.nameAr : null,
      // For single-day events, set endDate = startDate
      endDate: values.isSingleDay ? values.startDate : values.endDate,
      startTime: values.isSingleDay ? values.startTime : null,
      endTime: values.isSingleDay ? values.endTime : null,
    })
  }

  const isLoading = form.formState.isSubmitting || isPending
  const isDirty = form.formState.isDirty
  const isDisabled = isLoading || !canEdit

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Top Submit Button */}
        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !isDirty}>
              {isLoading && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}

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
                    <Input disabled={isDisabled} {...field} />
                  </FormControl>
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
                      disabled={isDisabled}
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
                        disabled={isDisabled}
                        dir="rtl"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                        disabled={isDisabled}
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
                      disabled={isDisabled}
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
                      disabled={isDisabled}
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
            <FormItem>
              <FormLabel>{t("fields.venue")}</FormLabel>
              <PlaceAutocompleteInput
                value={form.watch("venue") || ""}
                onChange={(place: PlaceResult | null) => {
                  if (place) {
                    form.setValue("venue", place.venue, { shouldDirty: true })
                    form.setValue("venueAddress", place.venueAddress, { shouldDirty: true })
                    form.setValue("latitude", place.latitude, { shouldDirty: true })
                    form.setValue("longitude", place.longitude, { shouldDirty: true })
                    form.setValue("placeId", place.placeId, { shouldDirty: true })
                    form.setValue("city", place.city, { shouldDirty: true })
                    form.setValue("country", place.country, { shouldDirty: true })
                  }
                }}
                placeholder={t("fields.venuePlaceholder")}
                disabled={isDisabled}
              />
              {form.watch("venueAddress") && (
                <FormDescription className="text-xs">
                  {form.watch("venueAddress")}
                </FormDescription>
              )}
              {form.watch("latitude") && form.watch("longitude") && (
                <LocationPreview
                  latitude={parseFloat(form.watch("latitude")!)}
                  longitude={parseFloat(form.watch("longitude")!)}
                  venue={form.watch("venue") || undefined}
                  height="180px"
                  className="mt-3"
                />
              )}
            </FormItem>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Dates & Deadlines</CardTitle>
            <CardDescription>When is your event happening?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      disabled={isDisabled}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Date Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
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
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isDisabled}
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
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isDisabled}
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
              )}
            </div>

            {/* Time pickers - Only for single-day events */}
            {watchIsSingleDay && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("fields.startTime")}</FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value ?? undefined}
                          onChange={field.onChange}
                          disabled={isDisabled}
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
                          value={field.value ?? undefined}
                          onChange={field.onChange}
                          disabled={isDisabled}
                          placeholder="Select end time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                          disabled={isDisabled}
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
                      disabled={isDisabled}
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
                      disabled={isDisabled}
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
                      disabled={isDisabled}
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
                      disabled={isDisabled}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.autoAcknowledgementEmails"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t("settings.autoAcknowledgementEmails")}</FormLabel>
                    <FormDescription>
                      {t("settings.autoAcknowledgementEmailsDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* VAPP Settings */}
        <Card>
          <CardHeader>
            <CardTitle>VAPP Settings</CardTitle>
            <CardDescription>Configure Vehicle Access Parking Permits for guests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="settings.vapp.enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable VAPP</FormLabel>
                    <FormDescription>
                      Generate vehicle access parking permits for guests
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("settings.vapp.enabled") && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="settings.vapp.venueCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., KAS"
                            disabled={isDisabled}
                            maxLength={10}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormDescription>
                          3-letter code for the venue (shown on permit)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="settings.vapp.matchCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., M21"
                            disabled={isDisabled}
                            maxLength={10}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormDescription>
                          Code for this match/session (used in serial numbers)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("settings.vapp.matchCode") && (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Generate Serial Numbers</p>
                      <p className="text-muted-foreground text-xs">
                        Assign serial numbers to guests who don&apos;t have one yet
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateSerials({ eventId: event.id })}
                      disabled={isGenerating}
                    >
                      {isGenerating && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                      Generate
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !isDirty}>
              {isLoading && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}
      </form>

      {/* Email Sender Settings - separate from form since it has its own mutations */}
      <div className="mt-6">
        <EventEmailSenderCard
          eventId={event.id}
          emailSettings={event.settings?.emailSettings}
        />
      </div>

      {/* Email Configuration - separate from form since it has its own mutations */}
      <div className="mt-6">
        <EmailConfigurationCard
          eventId={event.id}
          eventSlug={event.slug}
          workspaceSlug={workspaceSlug}
        />
      </div>

      {/* Custom Domain Configuration */}
      <div className="mt-6">
        <EventCustomDomainCard
          eventId={event.id}
          customDomain={event.customDomain}
          customDomainVerified={event.customDomainVerified}
          customDomainVerificationToken={event.customDomainVerificationToken}
        />
      </div>

      {/* Short RSVP Links */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Short RSVP Links</CardTitle>
          <CardDescription>
            Generate short, shareable RSVP links for cleaner URLs when sharing on WhatsApp and social media
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Generate 8-character short codes for all guests who don&apos;t have one yet.
              New guests automatically get short codes when added.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => backfillShortCodes({ eventId: event.id })}
              disabled={isBackfilling}
            >
              {isBackfilling && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
              Generate Short Codes
            </Button>
          </div>
        </CardContent>
      </Card>
    </Form>
  )
}
