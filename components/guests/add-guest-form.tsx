"use client"

import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useCreateGuest } from "@/trpc/hooks/guests-hooks"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/components/global/icons"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface AddGuestFormProps {
  eventId: string
  categories: GuestCategory[]
  onSuccess: () => void
  onCancel: () => void
}

const addGuestSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z.string().optional(),
  position: z.string().optional(),
  entity: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  internalNotes: z.string().optional(),
})

type AddGuestFormValues = z.infer<typeof addGuestSchema>

export function AddGuestForm({ eventId, categories, onSuccess, onCancel }: AddGuestFormProps) {
  const t = useTranslations("guest")

  const form = useForm<AddGuestFormValues>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      position: "",
      entity: "",
      categoryId: categories.length > 0 ? categories[0].id : "",
      internalNotes: "",
    },
  })

  const { mutate, isPending } = useCreateGuest({
    onSuccess: () => {
      form.reset()
      onSuccess()
    },
  })

  const onSubmit = (values: AddGuestFormValues) => {
    mutate({
      eventId,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || undefined,
      position: values.position || undefined,
      entity: values.entity || undefined,
      categoryId: values.categoryId,
      internalNotes: values.internalNotes || undefined,
    })
  }

  return (
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
                  <Input placeholder="John" disabled={isPending} {...field} />
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
                  <Input placeholder="Doe" disabled={isPending} {...field} />
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
              <FormLabel>{t("fields.email")} *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Required for sending invitations and RSVP links
              </FormDescription>
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
                <Input
                  type="tel"
                  placeholder="+966 50 123 4567"
                  disabled={isPending}
                  {...field}
                />
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
                  <Input placeholder="CEO" disabled={isPending} {...field} />
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
                  <Input placeholder="Company Inc." disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.category")} *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isPending || categories.length === 0}
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
                          style={{ backgroundColor: category.color || "#6366f1" }}
                        />
                        {category.name} ({category.code})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <FormDescription className="text-destructive">
                  No categories defined. Please add categories first.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
            Add Guest
          </Button>
        </div>
      </form>
    </Form>
  )
}
