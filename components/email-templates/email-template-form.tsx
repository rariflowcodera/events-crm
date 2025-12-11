"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { z } from "zod"

import {
  useEmailTemplate,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
} from "@/trpc/hooks/email-hooks"
import { bilingualEmailContentSchema, emailTemplateTypeValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Icons } from "@/components/global/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { EmailTemplateEditor, type EditorHandle } from "@/components/email-templates/email-template-editor"
import { VariableInserter } from "@/components/email-templates/variable-inserter"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface EmailTemplateFormProps {
  eventId: string
  templateId: string | null
  categories: GuestCategory[]
  workspaceSlug: string
  eventSlug: string
  onSuccess: () => void
  onCancel: () => void
}

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  type: z.enum(emailTemplateTypeValues),
  categoryId: z.string().nullable().optional(),
  content: bilingualEmailContentSchema,
  defaultLanguage: z.enum(["en", "ar"]),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  replyTo: z.string().email().optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function EmailTemplateForm({
  eventId,
  templateId,
  categories,
  workspaceSlug,
  eventSlug,
  onSuccess,
  onCancel,
}: EmailTemplateFormProps) {
  const t = useTranslations("emailTemplate")
  const tCommon = useTranslations("common")
  const router = useRouter()

  // State
  const [activeLanguage, setActiveLanguage] = useState<"en" | "ar">("en")
  const [activeField, setActiveField] = useState<"subject" | "html" | "text">("html")

  // Refs for editors
  const htmlEnEditorRef = useRef<EditorHandle>(null)
  const htmlArEditorRef = useRef<EditorHandle>(null)
  const textEnEditorRef = useRef<EditorHandle>(null)
  const textArEditorRef = useRef<EditorHandle>(null)

  // Fetch template if editing
  const { data: template, isLoading: isLoadingTemplate } = useEmailTemplate(templateId || "")

  // Mutations
  const { mutate: createTemplate, isPending: isCreating } = useCreateEmailTemplate({
    onSuccess: () => onSuccess(),
  })

  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateEmailTemplate({
    onSuccess: () => onSuccess(),
  })

  const isLoading = isCreating || isUpdating

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "invitation",
      categoryId: null,
      content: {
        en: {
          subject: "",
          htmlContent: "",
          textContent: "",
        },
        ar: {
          subject: "",
          htmlContent: "",
          textContent: "",
        },
      },
      defaultLanguage: "en",
      fromName: "",
      fromEmail: "",
      replyTo: "",
      isDefault: false,
    },
  })

  // Load template data when editing
  useEffect(() => {
    if (template && templateId) {
      form.reset({
        name: template.name,
        type: template.type,
        categoryId: template.categoryId,
        content: template.content,
        defaultLanguage: (template.defaultLanguage as "en" | "ar") || "en",
        fromName: template.fromName || "",
        fromEmail: template.fromEmail || "",
        replyTo: template.replyTo || "",
        isDefault: template.isDefault,
      })
    }
  }, [template, templateId, form])

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    if (templateId) {
      updateTemplate({
        templateId,
        ...data,
        categoryId: data.categoryId || null,
      })
    } else {
      createTemplate({
        eventId,
        ...data,
        categoryId: data.categoryId || undefined,
      })
    }
  }

  // Handle variable insertion
  const handleInsertVariable = (variable: string) => {
    if (activeLanguage === "en") {
      if (activeField === "subject") {
        // Append variable to subject (simple approach)
        const currentValue = form.getValues("content.en.subject")
        form.setValue("content.en.subject", currentValue + variable)
      } else if (activeField === "html") {
        htmlEnEditorRef.current?.insertAtCursor(variable)
      } else if (activeField === "text") {
        textEnEditorRef.current?.insertAtCursor(variable)
      }
    } else {
      if (activeField === "subject") {
        const currentValue = form.getValues("content.ar.subject") || ""
        form.setValue("content.ar.subject", currentValue + variable)
      } else if (activeField === "html") {
        htmlArEditorRef.current?.insertAtCursor(variable)
      } else if (activeField === "text") {
        textArEditorRef.current?.insertAtCursor(variable)
      }
    }
  }

  // Check if Arabic content exists
  const hasArContent =
    (form.watch("content.ar.subject") || "").length > 0 ||
    (form.watch("content.ar.htmlContent") || "").length > 0

  // Handle preview navigation - use sessionStorage instead of query params to avoid URL length limits
  const handlePreview = useCallback(() => {
    const previewData = {
      subject:
        activeLanguage === "en"
          ? form.getValues("content.en.subject")
          : form.getValues("content.ar.subject") || form.getValues("content.en.subject"),
      html:
        activeLanguage === "en"
          ? form.getValues("content.en.htmlContent")
          : form.getValues("content.ar.htmlContent") || form.getValues("content.en.htmlContent"),
      text:
        activeLanguage === "en"
          ? form.getValues("content.en.textContent")
          : form.getValues("content.ar.textContent") || form.getValues("content.en.textContent"),
      lang: activeLanguage,
    }

    sessionStorage.setItem("emailPreviewData", JSON.stringify(previewData))
    router.push(`/${workspaceSlug}/events/${eventSlug}/email-preview`)
  }, [activeLanguage, form, router, workspaceSlug, eventSlug])

  if (templateId && isLoadingTemplate) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Details Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t("templateDetails")}</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="VIP Guest Invitation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.type")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {emailTemplateTypeValues.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`types.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.categoryOptional")}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">All categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: category.color || "#6366f1" }}
                              />
                              {category.name}
                            </span>
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
                name="defaultLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.defaultLanguage")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">{t("languages.en")}</SelectItem>
                        <SelectItem value="ar">{t("languages.ar")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("fields.markAsDefault")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Email Content Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t("emailContent")}</h4>
              <Tabs
                value={activeLanguage}
                onValueChange={(v) => setActiveLanguage(v as "en" | "ar")}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="en" className="text-xs px-3 h-7">
                    {t("languages.en")}
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      ✓
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="ar" className="text-xs px-3 h-7">
                    {t("languages.ar")}
                    {hasArContent && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                        ✓
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Language Content */}
            <div dir={activeLanguage === "ar" ? "rtl" : "ltr"}>
              {activeLanguage === "en" ? (
                <div className="space-y-4">
                  {/* English Subject */}
                  <FormField
                    control={form.control}
                    name="content.en.subject"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>{t("fields.subject")}</FormLabel>
                          <VariableInserter
                            eventId={eventId}
                            onInsert={handleInsertVariable}
                            onFocus={() => setActiveField("subject")}
                          />
                        </div>
                        <FormControl>
                          <Input
                            placeholder="You're Invited to {{event.name}}"
                            onFocus={() => setActiveField("subject")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* English HTML Content */}
                  <FormField
                    control={form.control}
                    name="content.en.htmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>{t("fields.htmlContent")}</FormLabel>
                          <VariableInserter
                            eventId={eventId}
                            onInsert={handleInsertVariable}
                            onFocus={() => setActiveField("html")}
                          />
                        </div>
                        <FormControl>
                          <EmailTemplateEditor
                            ref={htmlEnEditorRef}
                            value={field.value || ""}
                            onChange={field.onChange}
                            onFocus={() => setActiveField("html")}
                            placeholder="<!DOCTYPE html>..."
                            minHeight="250px"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* English Text Content */}
                  <FormField
                    control={form.control}
                    name="content.en.textContent"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>{t("fields.textContentOptional")}</FormLabel>
                          <VariableInserter
                            eventId={eventId}
                            onInsert={handleInsertVariable}
                            onFocus={() => setActiveField("text")}
                          />
                        </div>
                        <FormControl>
                          <EmailTemplateEditor
                            ref={textEnEditorRef}
                            value={field.value || ""}
                            onChange={field.onChange}
                            onFocus={() => setActiveField("text")}
                            placeholder="Plain text version..."
                            minHeight="120px"
                            language="text"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Arabic Subject */}
                  <FormField
                    control={form.control}
                    name="content.ar.subject"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>{t("fields.subject")}</FormLabel>
                          <VariableInserter
                            eventId={eventId}
                            onInsert={handleInsertVariable}
                            onFocus={() => setActiveField("subject")}
                          />
                        </div>
                        <FormControl>
                          <Input
                            placeholder="دعوة لحضور {{event.name}}"
                            className="text-right"
                            onFocus={() => setActiveField("subject")}
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Arabic HTML Content */}
                  <FormField
                    control={form.control}
                    name="content.ar.htmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>{t("fields.htmlContent")}</FormLabel>
                          <VariableInserter
                            eventId={eventId}
                            onInsert={handleInsertVariable}
                            onFocus={() => setActiveField("html")}
                          />
                        </div>
                        <FormControl>
                          <EmailTemplateEditor
                            ref={htmlArEditorRef}
                            value={field.value || ""}
                            onChange={field.onChange}
                            onFocus={() => setActiveField("html")}
                            placeholder="<!DOCTYPE html>..."
                            minHeight="250px"
                            direction="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Arabic Text Content */}
                  <FormField
                    control={form.control}
                    name="content.ar.textContent"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>{t("fields.textContentOptional")}</FormLabel>
                          <VariableInserter
                            eventId={eventId}
                            onInsert={handleInsertVariable}
                            onFocus={() => setActiveField("text")}
                          />
                        </div>
                        <FormControl>
                          <EmailTemplateEditor
                            ref={textArEditorRef}
                            value={field.value || ""}
                            onChange={field.onChange}
                            onFocus={() => setActiveField("text")}
                            placeholder="النص العادي..."
                            minHeight="120px"
                            direction="rtl"
                            language="text"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={!form.getValues("content.en.htmlContent")}
            >
              <Icons.eye className="mr-2 h-4 w-4" />
              {t("preview")}
            </Button>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  t("save")
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  )
}
