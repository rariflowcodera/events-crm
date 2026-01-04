"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { BilingualInput } from "@/components/rsvp-form-builder/bilingual-input"
import { useCreateEventForm } from "@/trpc/hooks/event-forms-hooks"
import { formPurposeValues } from "@/lib/schemas"
import type { FormConfig } from "@/server/db/schemas/event-form"

const bilingualTextSchema = z.object({
  en: z.string().min(1, "English name is required").max(100),
  ar: z.string().max(100).optional(),
})

const createFormSchema = z.object({
  name: bilingualTextSchema,
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.object({
    en: z.string().max(500),
    ar: z.string().max(500).optional(),
  }).optional(),
  purpose: z.enum(formPurposeValues).optional(),
})

type CreateFormValues = z.infer<typeof createFormSchema>

interface CreateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  workspaceSlug: string
  eventSlug: string
}

const purposeOptions = [
  { value: "travel", label: "Travel Requirements", icon: Icons.plane },
  { value: "survey", label: "Survey", icon: Icons.clipboardList },
  { value: "feedback", label: "Feedback", icon: Icons.messageSquare },
  { value: "registration", label: "Registration", icon: Icons.userPlus },
  { value: "custom", label: "Custom", icon: Icons.fileText },
] as const

// Create a default empty form config
function createDefaultFormConfig(): FormConfig {
  return {
    sections: [
      {
        id: crypto.randomUUID(),
        title: { en: "Section 1" },
        enabled: true,
        sortOrder: 0,
        fields: [],
      },
    ],
    settings: {
      showProgressIndicator: true,
      confirmationMessage: { en: "Thank you for your submission!" },
      submitButtonText: { en: "Submit" },
    },
  }
}

export function CreateFormDialog({
  open,
  onOpenChange,
  eventId,
  workspaceSlug,
  eventSlug,
}: CreateFormDialogProps) {
  const t = useTranslations()
  const router = useRouter()

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: { en: "", ar: "" },
      slug: "",
      description: { en: "", ar: "" },
      purpose: "custom",
    },
  })

  const { mutate: createForm, isPending } = useCreateEventForm({
    onSuccess: (formId) => {
      // Get slug before reset
      const formSlug = form.getValues("slug")
      onOpenChange(false)
      form.reset()
      // Navigate to the form builder
      router.push(`/${workspaceSlug}/events/${eventSlug}/forms/${formSlug}`)
    },
  })

  const handleSubmit = (values: CreateFormValues) => {
    createForm({
      eventId,
      name: values.name,
      slug: values.slug,
      description: values.description?.en ? values.description : null,
      purpose: values.purpose,
      formConfig: createDefaultFormConfig(),
      accessType: "email",
      allowMultipleSubmissions: false,
      allowAmendments: true,
    })
  }

  // Auto-generate slug from English name
  const handleNameChange = (name: { en: string; ar?: string }) => {
    form.setValue("name", name)
    // Only auto-generate if user hasn't manually edited slug
    if (!form.formState.dirtyFields.slug) {
      const slug = name.en
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 100)
      form.setValue("slug", slug)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("forms.createForm")}</DialogTitle>
          <DialogDescription>{t("forms.createFormDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <BilingualInput
                      label={t("forms.formName")}
                      value={field.value || { en: "", ar: "" }}
                      onChange={(value) => handleNameChange(value)}
                      placeholder={{ en: t("forms.formNamePlaceholder") }}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.formSlug")}</FormLabel>
                  <FormControl>
                    <Input placeholder="travel-preferences" {...field} />
                  </FormControl>
                  <FormDescription>{t("forms.formSlugDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.formPurpose")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("forms.selectPurpose")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {purposeOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{t(`forms.purpose.${option.value}`)}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <BilingualInput
                      label={t("forms.formDescription")}
                      value={field.value || { en: "", ar: "" }}
                      onChange={field.onChange}
                      placeholder={{ en: t("forms.formDescriptionPlaceholder") }}
                      multiline
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t("forms.createForm")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
