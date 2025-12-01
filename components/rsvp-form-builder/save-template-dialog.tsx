"use client"

import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useSaveFormAsTemplate } from "@/trpc/hooks/rsvp-templates-hooks"
import { rsvpFormTemplateCategoryValues } from "@/lib/schemas"

interface SaveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onSuccess?: () => void
}

const formSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  description: z.string().max(500).optional(),
  category: z.enum(rsvpFormTemplateCategoryValues).default("custom"),
})

type FormValues = z.infer<typeof formSchema>

const CATEGORY_LABELS: Record<string, string> = {
  corporate: "Corporate",
  conference: "Conference",
  gala: "Gala",
  sports: "Sports",
  government: "Government",
  wedding: "Wedding",
  custom: "Custom",
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  eventId,
  onSuccess,
}: SaveTemplateDialogProps) {
  const t = useTranslations("rsvpFormBuilder")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "custom",
    },
  })

  const { mutate: saveAsTemplate, isPending } = useSaveFormAsTemplate({
    onSuccess: () => {
      onOpenChange(false)
      form.reset()
      onSuccess?.()
    },
  })

  const handleSubmit = (values: FormValues) => {
    saveAsTemplate({
      eventId,
      name: values.name,
      description: values.description,
      category: values.category,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("saveAsTemplate")}</DialogTitle>
          <DialogDescription>
            {t("saveAsTemplateDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("templateName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("templateNamePlaceholder")} {...field} />
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
                  <FormLabel>{t("templateDescription")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("templateDescriptionPlaceholder")}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("templateCategory")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectCategory")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rsvpFormTemplateCategoryValues.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_LABELS[category] || category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("saving") : t("saveTemplate")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
