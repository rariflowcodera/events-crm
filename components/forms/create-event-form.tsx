"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { createRoute } from "@/lib/routes"
import { useCreateEvent } from "@/trpc/hooks/events-hooks"
import { useCreateEventModal } from "@/hooks/use-create-event-modal"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "@/components/ui/calendar"
import { PlaceAutocompleteInput, type PlaceResult } from "@/components/forms/place-autocomplete-input"
import { LocationPreview } from "@/components/events/location-preview"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"

const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100),
  description: z.string().optional(),
  eventType: z.string().optional(),
  venue: z.string().optional(),
  venueAddress: z.string().optional(),
  // Location coordinates from Google Places
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  placeId: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  rsvpDeadline: z.date().optional(),
})

type CreateEventFormValues = z.infer<typeof createEventSchema>

interface CreateEventFormProps {
  className?: string
  workspaceSlug: string
  onSuccess?: () => void
}

export function CreateEventForm({
  className,
  workspaceSlug,
  onSuccess,
}: CreateEventFormProps) {
  const t = useTranslations("event")
  const router = useRouter()
  const { close } = useCreateEventModal()

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
      close()
      router.push(createRoute("event-detail", { slug: workspaceSlug, eventSlug: data.slug }).href)
      onSuccess?.()
    },
  })

  const onSubmit = (values: CreateEventFormValues) => {
    mutate({
      workspaceSlug,
      ...values,
    })
  }

  const isLoading = form.formState.isSubmitting || isPending

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("flex flex-col gap-y-6", className)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.name")}</FormLabel>
              <FormControl>
                <Input
                  placeholder="Annual Gala 2024"
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

        <FormItem>
          <FormLabel>{t("fields.venue")}</FormLabel>
          <PlaceAutocompleteInput
            value={form.watch("venue")}
            onChange={(place: PlaceResult | null) => {
              if (place) {
                form.setValue("venue", place.venue)
                form.setValue("venueAddress", place.venueAddress)
                form.setValue("latitude", place.latitude)
                form.setValue("longitude", place.longitude)
                form.setValue("placeId", place.placeId)
                form.setValue("city", place.city)
                form.setValue("country", place.country)
              }
            }}
            placeholder={t("fields.venuePlaceholder")}
            disabled={isLoading}
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
              venue={form.watch("venue")}
              height="180px"
              className="mt-3"
            />
          )}
        </FormItem>

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
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
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
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const startDate = form.getValues("startDate")
                        return startDate ? date < startDate : date < new Date()
                      }}
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
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
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

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
            {t("create")}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export function CreateEventFormSkeleton() {
  return (
    <div className="flex flex-col gap-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
