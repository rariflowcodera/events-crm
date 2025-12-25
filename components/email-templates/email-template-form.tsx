"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useForm, FormProvider, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { z } from "zod"

import {
  useEmailTemplate,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useCreateStructuredEmailTemplate,
  useUpdateStructuredContent,
  usePreviewStructuredDraft,
} from "@/trpc/hooks/email-hooks"
import { useMasterTemplates } from "@/trpc/hooks/master-template-hooks"
import { useEventDocuments } from "@/trpc/hooks/document-hooks"
import {
  bilingualEmailContentSchema,
  bilingualStructuredContentSchema,
  emailTemplateTypeValues,
} from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/global/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { EmailTemplateEditor, type EditorHandle } from "@/components/email-templates/email-template-editor"
import { VariableInserter } from "@/components/email-templates/variable-inserter"
import { DocumentInserter } from "@/components/email-templates/document-inserter"
import { StructuredContentEditor } from "@/components/email-templates/structured-content-editor"
import { toast } from "sonner"

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
  workspaceId: string
  workspaceSlug: string
  eventSlug: string
  onSuccess: () => void
  onCancel: () => void
}

// Form schema for legacy HTML mode
const legacyFormSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  type: z.enum(emailTemplateTypeValues),
  categoryId: z.string().nullable().optional(),
  content: bilingualEmailContentSchema,
  defaultLanguage: z.enum(["en", "ar"]),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  replyTo: z.string().email().optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
  useStructuredMode: z.literal(false),
})

// Form schema for structured content mode
const structuredFormSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  type: z.enum(emailTemplateTypeValues),
  categoryId: z.string().nullable().optional(),
  structuredContent: bilingualStructuredContentSchema,
  masterTemplateId: z.string().nullable().optional(),
  showBannerFooter: z.boolean().default(true),
  defaultLanguage: z.enum(["en", "ar"]),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  replyTo: z.string().email().optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
  useStructuredMode: z.literal(true),
})

// Combined form schema
const formSchema = z.discriminatedUnion("useStructuredMode", [
  legacyFormSchema,
  structuredFormSchema,
])

type FormValues = z.infer<typeof formSchema>
type LegacyFormValues = z.infer<typeof legacyFormSchema>
type StructuredFormValues = z.infer<typeof structuredFormSchema>

export function EmailTemplateForm({
  eventId,
  templateId,
  categories,
  workspaceId,
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
  const [useStructuredMode, setUseStructuredMode] = useState(false)

  // Handle language tab switching - clear errors to prevent stale validation state
  const handleLanguageChange = (lang: "en" | "ar") => {
    setActiveLanguage(lang)
    // Clear errors for both languages to prevent stale validation state
    form.clearErrors("structuredContent.en")
    form.clearErrors("structuredContent.ar")
    form.clearErrors("content.en")
    form.clearErrors("content.ar")
  }

  // Refs for editors
  const htmlEnEditorRef = useRef<EditorHandle>(null)
  const htmlArEditorRef = useRef<EditorHandle>(null)
  const textEnEditorRef = useRef<EditorHandle>(null)
  const textArEditorRef = useRef<EditorHandle>(null)

  // Fetch template if editing
  const { data: template, isLoading: isLoadingTemplate } = useEmailTemplate(templateId || "")

  // Fetch documents for preview
  const { data: documents } = useEventDocuments(eventId)

  // Fetch master templates for structured mode
  const { data: masterTemplates } = useMasterTemplates({
    workspaceId,
    eventId,
    includeWorkspaceLevel: true,
  })

  // Mutations - Legacy mode
  const { mutate: createTemplate, isPending: isCreating } = useCreateEmailTemplate({
    onSuccess: () => onSuccess(),
  })

  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateEmailTemplate({
    onSuccess: () => onSuccess(),
  })

  // Mutations - Structured mode
  const { mutate: createStructuredTemplate, isPending: isCreatingStructured } = useCreateStructuredEmailTemplate({
    onSuccess: () => onSuccess(),
  })

  const { mutate: updateStructuredContent, isPending: isUpdatingStructured } = useUpdateStructuredContent({
    onSuccess: () => onSuccess(),
  })

  // Preview hook for structured content
  const { mutateAsync: previewStructuredDraft, isPending: isPreviewing } = usePreviewStructuredDraft()

  const isLoading = isCreating || isUpdating || isCreatingStructured || isUpdatingStructured

  // Form - using legacy mode as default
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
      useStructuredMode: false,
    } as LegacyFormValues,
  })

  // Load template data when editing
  useEffect(() => {
    if (template && templateId) {
      // Check if template has structured content
      const hasStructuredContent = template.structuredContent && Object.keys(template.structuredContent).length > 0

      if (hasStructuredContent) {
        setUseStructuredMode(true)
        form.reset({
          name: template.name,
          type: template.type,
          categoryId: template.categoryId,
          structuredContent: template.structuredContent,
          masterTemplateId: template.masterTemplateId || null,
          showBannerFooter: template.showBannerFooter ?? true,
          defaultLanguage: (template.defaultLanguage as "en" | "ar") || "en",
          fromName: template.fromName || "",
          fromEmail: template.fromEmail || "",
          replyTo: template.replyTo || "",
          isDefault: template.isDefault,
          useStructuredMode: true,
        } as StructuredFormValues)
      } else {
        setUseStructuredMode(false)
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
          useStructuredMode: false,
        } as LegacyFormValues)
      }
    }
  }, [template, templateId, form])

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    if (data.useStructuredMode) {
      // Structured mode
      const structuredData = data as StructuredFormValues

      // Debug: Log what we're sending
      console.log("Submitting structured content:", JSON.stringify(structuredData.structuredContent, null, 2))

      // Validate English required fields explicitly as a safeguard
      const enContent = structuredData.structuredContent.en
      if (!enContent?.subject || !enContent?.bodyParagraphs?.length) {
        toast.error("English subject and at least one paragraph are required")
        setActiveLanguage("en")
        return
      }

      // Filter out empty body paragraphs before sending (handle both string and object formats)
      const filteredBodyParagraphs = enContent.bodyParagraphs.filter(
        (p: string | { content: string }) => {
          const content = typeof p === "string" ? p : p.content
          return content.trim()
        }
      )
      if (filteredBodyParagraphs.length === 0) {
        toast.error("At least one non-empty paragraph is required")
        setActiveLanguage("en")
        return
      }

      if (templateId) {
        updateStructuredContent({
          templateId,
          structuredContent: structuredData.structuredContent,
          masterTemplateId: structuredData.masterTemplateId || undefined,
          showBannerFooter: structuredData.showBannerFooter,
          // Metadata fields
          name: structuredData.name,
          type: structuredData.type,
          categoryId: structuredData.categoryId || null,
          defaultLanguage: structuredData.defaultLanguage,
          fromName: structuredData.fromName || undefined,
          fromEmail: structuredData.fromEmail || undefined,
          replyTo: structuredData.replyTo || undefined,
          isDefault: structuredData.isDefault,
        })
      } else {
        createStructuredTemplate({
          eventId,
          name: structuredData.name,
          type: structuredData.type,
          categoryId: structuredData.categoryId || undefined,
          structuredContent: structuredData.structuredContent,
          masterTemplateId: structuredData.masterTemplateId || undefined,
          showBannerFooter: structuredData.showBannerFooter,
          defaultLanguage: structuredData.defaultLanguage,
          fromName: structuredData.fromName || undefined,
          fromEmail: structuredData.fromEmail || undefined,
          replyTo: structuredData.replyTo || undefined,
          isDefault: structuredData.isDefault,
        })
      }
    } else {
      // Legacy HTML mode
      const legacyData = data as LegacyFormValues
      if (templateId) {
        updateTemplate({
          templateId,
          ...legacyData,
          categoryId: legacyData.categoryId || null,
        })
      } else {
        createTemplate({
          eventId,
          ...legacyData,
          categoryId: legacyData.categoryId || undefined,
        })
      }
    }
  }

  // Handle form validation errors - show which tab has errors
  const onInvalid = (errors: FieldErrors<FormValues>) => {
    console.log("Validation errors:", errors)
    if (useStructuredMode) {
      // Check for structured content errors and switch to appropriate tab
      const structuredErrors = errors as FieldErrors<StructuredFormValues>
      if (structuredErrors.structuredContent?.en) {
        setActiveLanguage("en")
        toast.error("Please fill in required English fields")
      } else if (structuredErrors.structuredContent?.ar) {
        setActiveLanguage("ar")
        toast.error("Please check Arabic fields")
      }
    } else {
      // Legacy mode errors
      const legacyErrors = errors as FieldErrors<LegacyFormValues>
      if (legacyErrors.content?.en) {
        setActiveLanguage("en")
        toast.error("Please fill in required English content")
      } else if (legacyErrors.content?.ar) {
        setActiveLanguage("ar")
        toast.error("Please check Arabic content")
      }
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

  // Check if Arabic content exists (only for legacy mode)
  const watchedContent = !useStructuredMode ? form.watch("content" as "content") : undefined
  const hasArContent = useStructuredMode
    ? false // Structured mode handles Arabic separately
    : ((watchedContent as LegacyFormValues["content"])?.ar?.subject || "").length > 0 ||
      ((watchedContent as LegacyFormValues["content"])?.ar?.htmlContent || "").length > 0

  // Handle mode toggle
  const handleModeToggle = (structured: boolean) => {
    if (templateId) {
      // Don't allow mode switching for existing templates
      return
    }

    setUseStructuredMode(structured)

    // Reset form with appropriate defaults
    const currentValues = form.getValues()
    if (structured) {
      form.reset({
        name: currentValues.name,
        type: currentValues.type,
        categoryId: currentValues.categoryId,
        structuredContent: {
          en: {
            subject: "",
            greeting: "",
            heading: "",
            subheading: "",
            bodyParagraphs: [{ content: "" }],
            cta: { text: "", url: "" },
            postCtaText: "",
          },
          ar: {
            subject: "",
            greeting: "",
            heading: "",
            subheading: "",
            bodyParagraphs: [],
            cta: { text: "", url: "" },
            postCtaText: "",
          },
        },
        masterTemplateId: null,
        showBannerFooter: true,
        defaultLanguage: currentValues.defaultLanguage,
        fromName: currentValues.fromName,
        fromEmail: currentValues.fromEmail,
        replyTo: currentValues.replyTo,
        isDefault: currentValues.isDefault,
        useStructuredMode: true,
      } as StructuredFormValues)
    } else {
      form.reset({
        name: currentValues.name,
        type: currentValues.type,
        categoryId: currentValues.categoryId,
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
        defaultLanguage: currentValues.defaultLanguage,
        fromName: currentValues.fromName,
        fromEmail: currentValues.fromEmail,
        replyTo: currentValues.replyTo,
        isDefault: currentValues.isDefault,
        useStructuredMode: false,
      } as LegacyFormValues)
    }
  }

  // Handle preview navigation - use sessionStorage instead of query params to avoid URL length limits
  const handlePreview = useCallback(async () => {
    // Trigger validation before preview
    const isValid = await form.trigger(useStructuredMode ? "structuredContent" : "content")
    if (!isValid) {
      toast.error("Please fill in required fields before preview")
      // Switch to the tab with errors
      if (useStructuredMode) {
        const errors = form.formState.errors as FieldErrors<StructuredFormValues>
        if (errors.structuredContent?.en) {
          setActiveLanguage("en")
        } else if (errors.structuredContent?.ar) {
          setActiveLanguage("ar")
        }
      } else {
        const errors = form.formState.errors as FieldErrors<LegacyFormValues>
        if (errors.content?.en) {
          setActiveLanguage("en")
        } else if (errors.content?.ar) {
          setActiveLanguage("ar")
        }
      }
      return
    }

    if (useStructuredMode) {
      // Structured mode: render via tRPC endpoint
      try {
        const structuredContent = form.getValues("structuredContent")
        const masterTemplateId = form.getValues("masterTemplateId")

        const showBannerFooter = form.getValues("showBannerFooter")
        const result = await previewStructuredDraft({
          eventId,
          structuredContent,
          masterTemplateId: masterTemplateId || undefined,
          showBannerFooter,
          language: activeLanguage,
        })

        const previewData = {
          subject: result.subject,
          html: result.html,
          text: result.text || "",
          lang: activeLanguage,
          documents: documents?.map((doc) => ({
            id: doc.id,
            name: doc.name,
            url: doc.url,
          })) || [],
          // Store data needed for refresh and navigation
          _meta: {
            eventId,
            templateId,
            structuredContent,
            masterTemplateId: masterTemplateId || null,
            showBannerFooter,
            isStructuredMode: true,
          },
        }

        sessionStorage.setItem("emailPreviewData", JSON.stringify(previewData))
        router.push(`/${workspaceSlug}/events/${eventSlug}/email-preview`)
      } catch (error) {
        // Error toast is handled by the hook
        console.error("Preview error:", error)
      }
    } else {
      // Legacy mode: use direct HTML from form
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
        // Include documents for preview rendering
        documents: documents?.map((doc) => ({
          id: doc.id,
          name: doc.name,
          url: doc.url,
        })) || [],
        // Store templateId for back navigation
        _meta: {
          templateId,
          isStructuredMode: false,
        },
      }

      sessionStorage.setItem("emailPreviewData", JSON.stringify(previewData))
      router.push(`/${workspaceSlug}/events/${eventSlug}/email-preview`)
    }
  }, [activeLanguage, form, router, workspaceSlug, eventSlug, documents, useStructuredMode, eventId, previewStructuredDraft])

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
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
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

            {/* Content Mode Toggle */}
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Content Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      {useStructuredMode
                        ? "Structured mode: Edit content in form fields with automatic styling"
                        : "HTML mode: Full control over email HTML content"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${!useStructuredMode ? "font-medium" : "text-muted-foreground"}`}>
                      HTML
                    </span>
                    <Switch
                      checked={useStructuredMode}
                      onCheckedChange={handleModeToggle}
                      disabled={!!templateId}
                    />
                    <span className={`text-xs ${useStructuredMode ? "font-medium" : "text-muted-foreground"}`}>
                      Structured
                    </span>
                  </div>
                </div>

                {/* Master Template Selector (only for structured mode) */}
                {useStructuredMode && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <FormField
                      control={form.control}
                      name="masterTemplateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Master Template</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "default" ? null : value)}
                            value={field.value || "default"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select master template" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="default">
                                <span className="flex items-center gap-2">
                                  <Icons.layout className="h-3.5 w-3.5" />
                                  Default Template
                                </span>
                              </SelectItem>
                              {masterTemplates?.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  <span className="flex items-center gap-2">
                                    <Icons.layout className="h-3.5 w-3.5" />
                                    {template.name}
                                    {template.isDefault && (
                                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                        Default
                                      </Badge>
                                    )}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The master template defines the email layout and styling
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {/* Banner Footer Toggle */}
                    <FormField
                      control={form.control}
                      name="showBannerFooter"
                      render={({ field }) => (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="space-y-0.5">
                            <Label className="font-normal">{t("showBannerFooter")}</Label>
                            <p className="text-xs text-muted-foreground">
                              {t("showBannerFooterDescription")}
                            </p>
                          </div>
                          <Switch
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Email Content Section */}
          {useStructuredMode ? (
            /* Structured Content Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t("emailContent")}</h4>
                <Tabs
                  value={activeLanguage}
                  onValueChange={(v) => handleLanguageChange(v as "en" | "ar")}
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
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Structured Content for selected language */}
              {/* IMPORTANT: Both editors are always mounted to preserve useFieldArray state */}
              {/* Using CSS visibility instead of conditional rendering */}
              <div className={activeLanguage === "en" ? "block" : "hidden"}>
                <StructuredContentEditor
                  eventId={eventId}
                  language="en"
                  namePrefix="structuredContent.en"
                />
              </div>
              <div className={activeLanguage === "ar" ? "block" : "hidden"}>
                <StructuredContentEditor
                  eventId={eventId}
                  language="ar"
                  namePrefix="structuredContent.ar"
                  isOptional
                />
              </div>
            </div>
          ) : (
            /* Legacy HTML Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t("emailContent")}</h4>
                <Tabs
                  value={activeLanguage}
                  onValueChange={(v) => handleLanguageChange(v as "en" | "ar")}
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
                            <div className="flex items-center gap-2">
                              <DocumentInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("subject")}
                              />
                              <VariableInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("subject")}
                              />
                            </div>
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
                            <div className="flex items-center gap-2">
                              <DocumentInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("html")}
                              />
                              <VariableInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("html")}
                              />
                            </div>
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
                            <div className="flex items-center gap-2">
                              <DocumentInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("text")}
                              />
                              <VariableInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("text")}
                              />
                            </div>
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
                            <div className="flex items-center gap-2">
                              <DocumentInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("subject")}
                              />
                              <VariableInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("subject")}
                              />
                            </div>
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
                            <div className="flex items-center gap-2">
                              <DocumentInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("html")}
                              />
                              <VariableInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("html")}
                              />
                            </div>
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
                            <div className="flex items-center gap-2">
                              <DocumentInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("text")}
                              />
                              <VariableInserter
                                eventId={eventId}
                                onInsert={handleInsertVariable}
                                onFocus={() => setActiveField("text")}
                              />
                            </div>
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
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={isPreviewing || (useStructuredMode ? false : !form.getValues("content.en.htmlContent"))}
            >
              {isPreviewing ? (
                <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.eye className="mr-2 h-4 w-4" />
              )}
              {isPreviewing ? "Loading..." : t("preview")}
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
