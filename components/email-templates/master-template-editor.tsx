"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Eye,
  Settings,
  Code,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { MasterTemplatePreview } from "./master-template-preview"
import { useMasterTemplatePreview } from "@/trpc/hooks/master-template-hooks"
import { cn } from "@/lib/utils"

// ============================================================================
// Types & Schema
// ============================================================================

const masterTemplateFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  structure: z.object({
    showLogo: z.boolean(),
    showAccentStrip: z.boolean(),
    showEnglishSection: z.boolean(),
    showArabicSection: z.boolean(),
    showDivider: z.boolean(),
    showFooter: z.boolean(),
    sectionOrder: z.array(z.enum(["en", "ar"])),
  }),
  htmlTemplate: z.string().optional(),
  isDefault: z.boolean().optional(),
})

type FormValues = z.infer<typeof masterTemplateFormSchema>

interface MasterTemplateEditorProps {
  workspaceId: string
  eventId?: string
  initialValues?: Partial<FormValues>
  defaultHtmlTemplate?: string
  onSubmit: (values: FormValues) => void
  onCancel: () => void
  isLoading?: boolean
  mode: "create" | "edit"
}

// ============================================================================
// Component
// ============================================================================

export function MasterTemplateEditor({
  workspaceId,
  eventId,
  initialValues,
  defaultHtmlTemplate,
  onSubmit,
  onCancel,
  isLoading,
  mode,
}: MasterTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<"structure" | "html">("structure")
  const [showPreview, setShowPreview] = useState(true)

  const form = useForm<FormValues>({
    resolver: zodResolver(masterTemplateFormSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      structure: initialValues?.structure || {
        showLogo: true,
        showAccentStrip: true,
        showEnglishSection: true,
        showArabicSection: true,
        showDivider: true,
        showFooter: true,
        sectionOrder: ["en", "ar"],
      },
      htmlTemplate: initialValues?.htmlTemplate || defaultHtmlTemplate || "",
      isDefault: initialValues?.isDefault || false,
    },
  })

  const watchedStructure = form.watch("structure")
  const watchedHtmlTemplate = form.watch("htmlTemplate")

  // Preview query
  const { data: previewData, isLoading: isPreviewLoading } = useMasterTemplatePreview({
    workspaceId,
    eventId,
    htmlTemplate: watchedHtmlTemplate,
    structure: watchedStructure,
  })

  const handleSubmit = form.handleSubmit(onSubmit)

  // Move language in section order
  const moveSectionOrder = (direction: "up" | "down") => {
    const current = form.getValues("structure.sectionOrder")
    if (current.length !== 2) return

    const newOrder = direction === "up" ? ["ar", "en"] : ["en", "ar"]
    form.setValue("structure.sectionOrder", newOrder as ("en" | "ar")[])
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {mode === "create" ? "Create Master Template" : "Edit Master Template"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure the layout and structure of your email template
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
            </div>
          </div>

          <div className={cn("grid gap-6", showPreview ? "lg:grid-cols-2" : "")}>
            {/* Editor Panel */}
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Template Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Default Email Template" />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Standard bilingual email template with logo and footer"
                            className="min-h-[60px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Default Template</FormLabel>
                          <FormDescription>
                            Use this template by default for new emails
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Structure Settings */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Structure</CardTitle>
                  <CardDescription>
                    Configure which sections to show in the email
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "structure" | "html")}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="structure" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Visual
                      </TabsTrigger>
                      <TabsTrigger value="html" className="gap-2">
                        <Code className="h-4 w-4" />
                        HTML
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="structure" className="space-y-4 mt-0">
                      {/* Section Toggles */}
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="structure.showLogo"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-2">
                              <div>
                                <Label className="font-normal">Show Logo</Label>
                                <p className="text-xs text-muted-foreground">
                                  Display workspace/event logo at the top
                                </p>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />

                        <Separator />

                        <FormField
                          control={form.control}
                          name="structure.showAccentStrip"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-2">
                              <div>
                                <Label className="font-normal">Show Accent Strip</Label>
                                <p className="text-xs text-muted-foreground">
                                  Colored bar at the top of the email
                                </p>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />

                        <Separator />

                        <FormField
                          control={form.control}
                          name="structure.showEnglishSection"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-2">
                              <div>
                                <Label className="font-normal">Show English Section</Label>
                                <p className="text-xs text-muted-foreground">
                                  Include English content in emails
                                </p>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />

                        <Separator />

                        <FormField
                          control={form.control}
                          name="structure.showArabicSection"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-2">
                              <div>
                                <Label className="font-normal">Show Arabic Section</Label>
                                <p className="text-xs text-muted-foreground">
                                  Include Arabic content (RTL) in emails
                                </p>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />

                        <Separator />

                        <FormField
                          control={form.control}
                          name="structure.showDivider"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-2">
                              <div>
                                <Label className="font-normal">Show Divider</Label>
                                <p className="text-xs text-muted-foreground">
                                  Line between English and Arabic sections
                                </p>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />

                        <Separator />

                        <FormField
                          control={form.control}
                          name="structure.showFooter"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-2">
                              <div>
                                <Label className="font-normal">Show Footer</Label>
                                <p className="text-xs text-muted-foreground">
                                  Footer text at the bottom
                                </p>
                              </div>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                      </div>

                      <Separator />

                      {/* Section Order */}
                      <div className="space-y-3">
                        <Label>Section Order</Label>
                        <p className="text-xs text-muted-foreground">
                          Drag to reorder which language appears first
                        </p>
                        <div className="space-y-2">
                          {watchedStructure.sectionOrder.map((lang, index) => (
                            <div
                              key={lang}
                              className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <Badge variant={lang === "en" ? "default" : "secondary"}>
                                {lang === "en" ? "English" : "Arabic"}
                              </Badge>
                              <span className="flex-1 text-sm text-muted-foreground">
                                {index === 0 ? "First" : "Second"}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={index === 0}
                                  onClick={() => moveSectionOrder("up")}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={index === 1}
                                  onClick={() => moveSectionOrder("down")}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="html" className="mt-0">
                      <FormField
                        control={form.control}
                        name="htmlTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>HTML Template</FormLabel>
                            <FormDescription>
                              Advanced: Edit the raw HTML template with Handlebars placeholders
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="font-mono text-xs min-h-[400px]"
                                placeholder="<!DOCTYPE html>..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs">
                        <p className="font-medium mb-1">Available placeholders:</p>
                        <code className="text-muted-foreground">
                          {`{{logoUrl}}, {{accentStripColor}}, {{enContent}}, {{arContent}}, {{footerText}}`}
                        </code>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <div className="lg:sticky lg:top-4 lg:self-start">
                <MasterTemplatePreview
                  html={previewData?.html}
                  subject={previewData?.subject}
                  text={previewData?.text}
                  isLoading={isPreviewLoading}
                  className="h-[700px]"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : mode === "create" ? "Create Template" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  )
}
