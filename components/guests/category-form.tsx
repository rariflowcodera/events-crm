"use client"

import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  useCreateGuestCategory,
  useUpdateGuestCategory,
} from "@/trpc/hooks/guest-categories-hooks"
import { useEmailTemplates } from "@/trpc/hooks/email-hooks"
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
import { Icons } from "@/components/global/icons"

interface GuestCategory {
  id: string
  name: string
  code: string
  description: string | null
  color: string | null
  sortOrder: number
  defaultEmailTemplateId: string | null
}

interface CategoryFormProps {
  eventId: string
  category?: GuestCategory | null
  onSuccess: () => void
  onCancel: () => void
}

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less")
    .regex(/^[A-Za-z0-9]+$/, "Code can only contain letters and numbers"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  defaultEmailTemplateId: z.string().uuid().nullable().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

const colorPresets = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
]

export function CategoryForm({
  eventId,
  category,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const t = useTranslations("guest")
  const isEditing = !!category

  // Fetch invitation templates for this event
  const { data: invitationTemplates, isLoading: loadingTemplates } = useEmailTemplates({
    eventId,
    type: "invitation",
  })

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      code: category?.code || "",
      description: category?.description || "",
      color: category?.color || "#6366f1",
      defaultEmailTemplateId: category?.defaultEmailTemplateId || null,
    },
  })

  const { mutate: createCategory, isPending: isCreating } = useCreateGuestCategory({
    onSuccess: () => {
      form.reset()
      onSuccess()
    },
  })

  const { mutate: updateCategory, isPending: isUpdating } = useUpdateGuestCategory({
    onSuccess: () => {
      onSuccess()
    },
  })

  const isPending = isCreating || isUpdating

  const onSubmit = (values: CategoryFormValues) => {
    if (isEditing && category) {
      updateCategory({
        categoryId: category.id,
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        color: values.color,
        defaultEmailTemplateId: values.defaultEmailTemplateId,
      })
    } else {
      createCategory({
        eventId,
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        color: values.color,
        defaultEmailTemplateId: values.defaultEmailTemplateId,
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="VIP Guest"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A descriptive name for this guest category
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code *</FormLabel>
              <FormControl>
                <Input
                  placeholder="AAA"
                  disabled={isPending}
                  maxLength={10}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription>
                A short code (e.g., AAA, A, B) for quick identification
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Top-tier guests with full service package"
                  disabled={isPending}
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          field.value === color
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                        disabled={isPending}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-full border"
                      style={{ backgroundColor: field.value }}
                    />
                    <Input
                      type="text"
                      placeholder="#6366f1"
                      disabled={isPending}
                      className="w-28"
                      {...field}
                    />
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultEmailTemplateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("invitationTemplate")}</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                value={field.value || "none"}
                disabled={isPending || loadingTemplates}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectTemplate")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">{t("noTemplateSelected")}</span>
                  </SelectItem>
                  {invitationTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t("invitationTemplateDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
