"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { ChevronDown, Mail } from "lucide-react"

import { useUpdateGuest, useRegenerateRsvpToken } from "@/trpc/hooks/guests-hooks"
import { getRsvpUrl } from "@/lib/rsvp-url"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icons } from "@/components/global/icons"
import { GuestStatusBadge } from "@/components/guests/guest-status-badge"
import { GuestEmailHistory } from "@/components/guests/guest-email-history"
import { GuestProfileImage } from "@/components/guests/guest-profile-image"
import { countries, getCountryName } from "@/lib/data/countries"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type GuestStatus =
  | "pending"
  | "invited"
  | "reminded"
  | "viewed"
  | "confirmed"
  | "declined"
  | "maybe"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

type GuestGender = "male" | "female" | "unspecified"

interface Guest {
  id: string
  firstName: string
  lastName: string
  displayNameAr: string | null
  email: string | null
  phone: string | null
  country: string | null
  gender: GuestGender | null
  title: string | null
  salutation: string | null
  position: string | null
  entity: string | null
  status: GuestStatus
  rsvpToken: string
  internalNotes: string | null
  hasCompanion: boolean | null
  dietaryRequirements: string | null
  profileImage: string | null
  category: GuestCategory
  createdAt: Date
  rsvpRespondedAt: Date | null
}

interface EventCustomDomain {
  customDomain: string | null
  customDomainVerified: boolean | null
}

interface GuestDetailContentProps {
  guest: Guest
  categories: GuestCategory[]
  eventId: string
  event: EventCustomDomain
  workspaceSlug: string
  /** Whether to start in edit mode */
  initialEditMode?: boolean
  /** Callback when save is successful */
  onSaveSuccess?: () => void
}

const statusOptions: { value: GuestStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "invited", label: "Invited" },
  { value: "reminded", label: "Reminded" },
  { value: "viewed", label: "Viewed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined", label: "Declined" },
  { value: "maybe", label: "Maybe" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No Show" },
]

const genderOptions: { value: GuestGender; labelKey: string }[] = [
  { value: "male", labelKey: "gender.male" },
  { value: "female", labelKey: "gender.female" },
  { value: "unspecified", labelKey: "gender.unspecified" },
]

const editGuestSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  displayNameAr: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["male", "female", "unspecified"]).optional(),
  title: z.string().max(50).optional(),
  salutation: z.string().max(100).optional(),
  position: z.string().optional(),
  entity: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum([
    "pending",
    "invited",
    "reminded",
    "viewed",
    "confirmed",
    "declined",
    "maybe",
    "waitlisted",
    "cancelled",
    "attended",
    "no_show",
  ]),
  internalNotes: z.string().optional(),
  hasCompanion: z.boolean().optional(),
  dietaryRequirements: z.string().optional(),
  profileImage: z.string().nullable().optional(),
})

type EditGuestFormValues = z.infer<typeof editGuestSchema>

/**
 * GuestDetailContent - The content for viewing/editing a guest
 *
 * Used by both the legacy GuestDetailSheet and the new page-based route.
 */
export function GuestDetailContent({
  guest,
  categories,
  eventId,
  event,
  workspaceSlug,
  initialEditMode = false,
  onSaveSuccess,
}: GuestDetailContentProps) {
  const t = useTranslations("guest")
  const { can } = usePermissions(workspaceSlug)

  // Permission check
  const canEditGuests = can(PERMISSIONS.MANAGE_GUESTS)

  // Only start in edit mode if user has permission
  const [isEditing, setIsEditing] = useState(initialEditMode && canEditGuests)
  const [emailHistoryOpen, setEmailHistoryOpen] = useState(false)

  const form = useForm<EditGuestFormValues>({
    resolver: zodResolver(editGuestSchema),
    defaultValues: {
      firstName: guest.firstName,
      lastName: guest.lastName,
      displayNameAr: guest.displayNameAr || "",
      email: guest.email || "",
      phone: guest.phone || "",
      country: guest.country || "",
      gender: guest.gender || undefined,
      title: guest.title || "",
      salutation: guest.salutation || "",
      position: guest.position || "",
      entity: guest.entity || "",
      categoryId: guest.category?.id || "",
      status: guest.status,
      internalNotes: guest.internalNotes || "",
      hasCompanion: guest.hasCompanion || false,
      dietaryRequirements: guest.dietaryRequirements || "",
      profileImage: guest.profileImage || "",
    },
  })

  const { mutate: updateGuest, isPending: isUpdating } = useUpdateGuest({
    onSuccess: () => {
      setIsEditing(false)
      onSaveSuccess?.()
    },
  })

  const { mutate: regenerateToken, isPending: isRegenerating } = useRegenerateRsvpToken()

  const onSubmit = (values: EditGuestFormValues) => {
    updateGuest({
      guestId: guest.id,
      firstName: values.firstName,
      lastName: values.lastName,
      displayNameAr: values.displayNameAr || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      country: values.country || undefined,
      gender: values.gender || undefined,
      title: values.title || undefined,
      salutation: values.salutation || undefined,
      position: values.position || undefined,
      entity: values.entity || undefined,
      categoryId: values.categoryId || undefined,
      status: values.status,
      internalNotes: values.internalNotes || undefined,
      hasCompanion: values.hasCompanion,
      dietaryRequirements: values.dietaryRequirements || undefined,
      profileImage: values.profileImage || undefined,
    })
  }

  const handleCopyRsvpLink = () => {
    const rsvpUrl = getRsvpUrl(event, guest.rsvpToken)
    navigator.clipboard.writeText(rsvpUrl)
  }

  const handleRegenerateToken = () => {
    regenerateToken({ guestId: guest.id })
  }

  return (
    <div className="space-y-6">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            Added {format(new Date(guest.createdAt), "MMM d, yyyy")}
          </p>
        </div>
        <GuestStatusBadge status={guest.status} />
      </div>

      {/* RSVP Link Section */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">RSVP Link</p>
            <p className="text-muted-foreground text-xs mt-1 font-mono">
              .../{guest.rsvpToken.slice(0, 8)}...
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyRsvpLink}>
              <Icons.copy className="h-4 w-4" />
            </Button>
            {canEditGuests && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateToken}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Icons.loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.refresh className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Profile Image */}
            <div className="flex justify-center pb-2">
              <FormField
                control={form.control}
                name="profileImage"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <GuestProfileImage
                        value={field.value}
                        onChange={(url) => {
                          field.onChange(url)
                          // Auto-save to database
                          if (url) {
                            updateGuest({
                              guestId: guest.id,
                              profileImage: url,
                            })
                          }
                        }}
                        eventId={eventId}
                        disabled={isUpdating}
                        guestName={`${form.watch("firstName")} ${form.watch("lastName")}`}
                        size="lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.firstName")}</FormLabel>
                    <FormControl>
                      <Input disabled={isUpdating} {...field} />
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
                    <FormLabel>{t("fields.lastName")}</FormLabel>
                    <FormControl>
                      <Input disabled={isUpdating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="displayNameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.displayNameAr")}</FormLabel>
                  <FormControl>
                    <Input
                      dir="rtl"
                      placeholder="الاسم بالعربية"
                      disabled={isUpdating}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guest Addressing Section */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.gender")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isUpdating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("gender.unspecified")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.title")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mr., Dr., Sheikh"
                        disabled={isUpdating}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salutation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.salutation")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your Excellency"
                        disabled={isUpdating}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" disabled={isUpdating} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.phone")}</FormLabel>
                    <FormControl>
                      <Input type="tel" disabled={isUpdating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.country")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isUpdating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.position")}</FormLabel>
                    <FormControl>
                      <Input disabled={isUpdating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="entity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.entity")}</FormLabel>
                    <FormControl>
                      <Input disabled={isUpdating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isUpdating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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

            {categories.length > 0 && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.category")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isUpdating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor: category.color || "#6366f1",
                                }}
                              />
                              {category.name} ({category.code})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="hasCompanion"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Has Companion</FormLabel>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isUpdating}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea disabled={isUpdating} rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <>
          {/* View Mode */}
          <div className="space-y-4">
            {/* Profile Image Display */}
            <div className="flex justify-center pb-2">
              <Avatar className="size-24 border-2 border-border">
                {guest.profileImage && (
                  <AvatarImage src={guest.profileImage} alt={`${guest.firstName} ${guest.lastName}`} />
                )}
                <AvatarFallback className="text-lg">
                  {guest.firstName[0]}{guest.lastName[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            {guest.displayNameAr && (
              <div className="text-center">
                <p className="text-muted-foreground text-xs">{t("fields.displayNameAr")}</p>
                <p className="text-sm" dir="rtl">{guest.displayNameAr}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Contact Information</h4>
              {canEditGuests && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Icons.edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs">{t("fields.email")}</p>
                <p className="text-sm">{guest.email || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("fields.phone")}</p>
                <p className="text-sm">{guest.phone || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("fields.country")}</p>
                <p className="text-sm">
                  {guest.country ? getCountryName(guest.country) || guest.country : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("fields.position")}</p>
                <p className="text-sm">{guest.position || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("fields.entity")}</p>
                <p className="text-sm">{guest.entity || "-"}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">RSVP Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Category</p>
                  <p className="text-sm">
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${guest.category.color || "#6366f1"}20`,
                        color: guest.category.color || "#6366f1",
                      }}
                    >
                      {guest.category.code}
                    </Badge>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Has Companion</p>
                  <p className="text-sm">{guest.hasCompanion ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Responded At</p>
                  <p className="text-sm">
                    {guest.rsvpRespondedAt
                      ? format(new Date(guest.rsvpRespondedAt), "MMM d, yyyy h:mm a")
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            {guest.internalNotes && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs">Internal Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{guest.internalNotes}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Email History Section */}
            <Collapsible open={emailHistoryOpen} onOpenChange={setEmailHistoryOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-0 hover:bg-transparent"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Email History</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      emailHistoryOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <GuestEmailHistory guestId={guest.id} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </>
      )}
    </div>
  )
}
