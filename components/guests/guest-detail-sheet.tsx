"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"

import { useUpdateGuest, useRegenerateRsvpToken } from "@/trpc/hooks/guests-hooks"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
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
import { Icons } from "@/components/global/icons"
import { GuestStatusBadge } from "@/components/guests/guest-status-badge"

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

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  position: string | null
  entity: string | null
  status: GuestStatus
  rsvpToken: string
  internalNotes: string | null
  hasCompanion: boolean | null
  dietaryRequirements: string | null
  category: GuestCategory
  createdAt: Date
  rsvpRespondedAt: Date | null
}

interface GuestDetailSheetProps {
  guest: Guest | null
  isOpen: boolean
  onClose: () => void
  categories: GuestCategory[]
  eventId: string
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

const editGuestSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
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
})

type EditGuestFormValues = z.infer<typeof editGuestSchema>

export function GuestDetailSheet({
  guest,
  isOpen,
  onClose,
  categories,
  eventId,
}: GuestDetailSheetProps) {
  const t = useTranslations("guest")
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<EditGuestFormValues>({
    resolver: zodResolver(editGuestSchema),
    defaultValues: {
      firstName: guest?.firstName || "",
      lastName: guest?.lastName || "",
      email: guest?.email || "",
      phone: guest?.phone || "",
      position: guest?.position || "",
      entity: guest?.entity || "",
      categoryId: guest?.category?.id || "",
      status: guest?.status || "pending",
      internalNotes: guest?.internalNotes || "",
      hasCompanion: guest?.hasCompanion || false,
      dietaryRequirements: guest?.dietaryRequirements || "",
    },
  })

  // Reset form when guest changes
  if (guest && form.getValues("firstName") !== guest.firstName) {
    form.reset({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email || "",
      phone: guest.phone || "",
      position: guest.position || "",
      entity: guest.entity || "",
      categoryId: guest.category?.id || "",
      status: guest.status,
      internalNotes: guest.internalNotes || "",
      hasCompanion: guest.hasCompanion || false,
      dietaryRequirements: guest.dietaryRequirements || "",
    })
  }

  const { mutate: updateGuest, isPending: isUpdating } = useUpdateGuest({
    onSuccess: () => {
      setIsEditing(false)
    },
  })

  const { mutate: regenerateToken, isPending: isRegenerating } = useRegenerateRsvpToken()

  const onSubmit = (values: EditGuestFormValues) => {
    if (!guest) return

    updateGuest({
      guestId: guest.id,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || undefined,
      phone: values.phone || undefined,
      position: values.position || undefined,
      entity: values.entity || undefined,
      categoryId: values.categoryId || undefined,
      status: values.status,
      internalNotes: values.internalNotes || undefined,
      hasCompanion: values.hasCompanion,
      dietaryRequirements: values.dietaryRequirements || undefined,
    })
  }

  const handleCopyRsvpLink = () => {
    if (!guest) return
    const rsvpUrl = `${window.location.origin}/rsvp/${guest.rsvpToken}`
    navigator.clipboard.writeText(rsvpUrl)
  }

  const handleRegenerateToken = () => {
    if (!guest) return
    regenerateToken({ guestId: guest.id })
  }

  const handleClose = () => {
    setIsEditing(false)
    onClose()
  }

  if (!guest) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>
                {guest.firstName} {guest.lastName}
              </SheetTitle>
              <SheetDescription>
                Added {format(new Date(guest.createdAt), "MMM d, yyyy")}
              </SheetDescription>
            </div>
            <GuestStatusBadge status={guest.status} />
          </div>
        </SheetHeader>

        <div className="mt-6 px-4 space-y-6">
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
              </div>
            </div>
          </div>

          <Separator />

          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Contact Information</h4>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Icons.edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
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
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
