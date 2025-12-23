"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MoreHorizontal, Plus, Pencil, Copy, Trash2, Star } from "lucide-react"
import { WorkspaceBranding } from "@/server/db/schemas/workspace"
import { useUpdateWorkspaceBranding } from "@/trpc/hooks/workspaces-hooks"
import {
  useMasterTemplates,
  useMasterTemplate,
  useSeedDefaultMasterTemplate,
  useCreateMasterTemplate,
  useUpdateMasterTemplate,
  useDeleteMasterTemplate,
  useDuplicateMasterTemplate,
  useSetDefaultMasterTemplate,
} from "@/trpc/hooks/master-template-hooks"

import { workspaceBrandingSchema, type MasterTemplateStructureInput } from "@/lib/schemas"
import { defaultMasterTemplate } from "@/lib/email/master-templates/default"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"
import { ColorPicker, LogoUploadGroup, BrandingPreview, EmailBrandingSettings } from "@/components/branding"
import { MasterTemplateEditor } from "@/components/email-templates/master-template-editor"
import { Icons } from "@/components/global/icons"

// ============================================================================
// Types
// ============================================================================

type WorkspaceBrandingFormProps = {
  workspaceId: string
  branding: Partial<WorkspaceBranding>
  canEdit: boolean
}

type FormValues = z.infer<typeof workspaceBrandingSchema>

// ============================================================================
// Component
// ============================================================================

export function WorkspaceBrandingForm({
  workspaceId,
  branding,
  canEdit,
}: WorkspaceBrandingFormProps) {
  const { mutate: updateBranding, isPending } = useUpdateWorkspaceBranding()

  // Master template state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null)

  // Master template hooks
  const { data: masterTemplates, isLoading: isLoadingTemplates } = useMasterTemplates({ workspaceId })
  const { data: editingTemplate, isLoading: isLoadingEditTemplate } = useMasterTemplate(editingTemplateId || "")
  const { mutate: seedDefault, isPending: isSeeding } = useSeedDefaultMasterTemplate()
  const { mutate: createTemplate, isPending: isCreating } = useCreateMasterTemplate({
    onSuccess: () => setEditorOpen(false),
  })
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateMasterTemplate({
    onSuccess: () => {
      setEditorOpen(false)
      setEditingTemplateId(null)
    },
  })
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteMasterTemplate({
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    },
  })
  const { mutate: duplicateTemplate, isPending: isDuplicating } = useDuplicateMasterTemplate()
  const { mutate: setDefaultTemplate, isPending: isSettingDefault } = useSetDefaultMasterTemplate()

  const hasTemplates = masterTemplates && masterTemplates.length > 0

  // Handlers
  const handleCreateNew = () => {
    setEditingTemplateId(null)
    setEditorOpen(true)
  }

  const handleEdit = (templateId: string) => {
    setEditingTemplateId(templateId)
    setEditorOpen(true)
  }

  const handleDelete = (template: { id: string; name: string }) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const handleEditorSubmit = (values: {
    name: string
    description?: string
    structure: MasterTemplateStructureInput
    htmlTemplate?: string
    isDefault?: boolean
  }) => {
    if (editingTemplateId) {
      updateTemplate({
        templateId: editingTemplateId,
        name: values.name,
        description: values.description,
        structure: values.structure,
        htmlTemplate: values.htmlTemplate,
        isDefault: values.isDefault,
      })
    } else {
      createTemplate({
        workspaceId,
        name: values.name,
        description: values.description,
        structure: values.structure,
        htmlTemplate: values.htmlTemplate || defaultMasterTemplate,
        isDefault: values.isDefault,
      })
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(workspaceBrandingSchema),
    defaultValues: {
      logo: branding.logo || "",
      logoDark: branding.logoDark || "",
      primaryColor: branding.primaryColor || "",
      accentColor: branding.accentColor || "",
      primaryColorDark: branding.primaryColorDark || "",
      accentColorDark: branding.accentColorDark || "",
      emailBranding: branding.emailBranding || {},
    },
  })

  const watchedValues = form.watch()

  const onSubmit = (data: FormValues) => {
    updateBranding({
      workspaceId,
      branding: {
        logo: data.logo || undefined,
        logoDark: data.logoDark || undefined,
        primaryColor: data.primaryColor || undefined,
        accentColor: data.accentColor || undefined,
        primaryColorDark: data.primaryColorDark || undefined,
        accentColorDark: data.accentColorDark || undefined,
        emailBranding: data.emailBranding && Object.keys(data.emailBranding).length > 0
          ? data.emailBranding
          : undefined,
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Visual Branding Card */}
          <SettingsWrapperCard className="max-w-none">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-semibold">
                Visual Branding
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Logos Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Logos</h3>
                <LogoUploadGroup
                  logo={watchedValues.logo}
                  logoDark={watchedValues.logoDark}
                  onLogoChange={(url) => form.setValue("logo", url, { shouldDirty: true })}
                  onLogoDarkChange={(url) => form.setValue("logoDark", url, { shouldDirty: true })}
                  disabled={!canEdit || isPending}
                />
              </div>

              <Separator />

              {/* Light Mode Colors */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Light Mode Colors</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Primary Color"
                          disabled={!canEdit || isPending}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accentColor"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Accent Color"
                          disabled={!canEdit || isPending}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Dark Mode Colors */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Dark Mode Colors</h3>
                  <p className="text-xs text-muted-foreground">
                    Optional. If not set, light mode colors will be used.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="primaryColorDark"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Primary Color (Dark)"
                          disabled={!canEdit || isPending}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accentColorDark"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Accent Color (Dark)"
                          disabled={!canEdit || isPending}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </SettingsWrapperCard>

          {/* Preview Card */}
          <div className="hidden lg:block">
            <BrandingPreview
              logo={watchedValues.logo}
              logoDark={watchedValues.logoDark}
              primaryColor={watchedValues.primaryColor || "#4F46E5"}
              accentColor={watchedValues.accentColor || "#0EA5E9"}
              className="sticky top-4"
            />
          </div>

          {/* Email Branding Section - spans full width */}
          <SettingsWrapperCard className="max-w-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-semibold">
                Email Branding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmailBrandingSettings
                namePrefix="emailBranding"
                visualBrandingColors={{
                  primaryColor: watchedValues.primaryColor,
                  accentColor: watchedValues.accentColor,
                }}
              />
            </CardContent>
          </SettingsWrapperCard>

          {/* Master Template Section - spans full width */}
          <SettingsWrapperCard className="max-w-none lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-muted-foreground text-sm font-semibold">
                    Email Master Templates
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Master templates define the layout and structure of all email templates
                  </CardDescription>
                </div>
                {hasTemplates && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEdit}
                    onClick={handleCreateNew}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Template
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !hasTemplates ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
                  <Icons.mail className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No master templates configured
                  </p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                    Create a master template to define the layout and structure of all your emails
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || isSeeding}
                      onClick={() => seedDefault({ workspaceId })}
                    >
                      {isSeeding ? (
                        <>
                          <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Use Default Template"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canEdit}
                      onClick={handleCreateNew}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Custom
                    </Button>
                  </div>
                </div>
              ) : (
                // Template list
                <div className="space-y-2">
                  {masterTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Icons.fileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{template.name}</span>
                            {template.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="mr-1 h-3 w-3" />
                                Default
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={!canEdit}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(template.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => duplicateTemplate({ templateId: template.id })}
                            disabled={isDuplicating}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          {!template.isDefault && (
                            <DropdownMenuItem
                              onClick={() => setDefaultTemplate({ templateId: template.id, workspaceId })}
                              disabled={isSettingDefault}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete({ id: template.id, name: template.name })}
                            disabled={isDeleting}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </SettingsWrapperCard>

          {/* Master Template Editor Sheet */}
          <Sheet open={editorOpen} onOpenChange={(open) => {
            setEditorOpen(open)
            if (!open) setEditingTemplateId(null)
          }}>
            <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {editingTemplateId ? "Edit Master Template" : "Create Master Template"}
                </SheetTitle>
                <SheetDescription>
                  Configure the layout and structure of your email template
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4 mt-6">
                {(editingTemplateId && isLoadingEditTemplate) ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <MasterTemplateEditor
                    key={editingTemplateId || 'new'}
                    workspaceId={workspaceId}
                    mode={editingTemplateId ? "edit" : "create"}
                    initialValues={editingTemplate ? {
                      name: editingTemplate.name,
                      description: editingTemplate.description || "",
                      structure: editingTemplate.structure || undefined,
                      htmlTemplate: editingTemplate.htmlTemplate,
                      isDefault: editingTemplate.isDefault,
                    } : undefined}
                    defaultHtmlTemplate={defaultMasterTemplate}
                    onSubmit={handleEditorSubmit}
                    onCancel={() => {
                      setEditorOpen(false)
                      setEditingTemplateId(null)
                    }}
                    isLoading={isCreating || isUpdating}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Master Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{templateToDelete?.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => templateToDelete && deleteTemplate({ templateId: templateToDelete.id })}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Submit Section - spans full width */}
          <div className="lg:col-span-2 flex justify-between items-center border-t pt-4">
            <p className="text-xs text-muted-foreground">
              These settings apply to your workspace dashboard and event defaults.
            </p>
            <Button type="submit" disabled={!canEdit || isPending || !form.formState.isDirty}>
              {isPending ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

export function WorkspaceBrandingFormSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <SettingsWrapperCard className="max-w-none">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-semibold">
            Workspace Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logos skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-16" />
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Colors skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>

          <Separator />

          {/* Dark mode colors skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Skeleton className="ml-auto h-9 w-28" />
        </CardFooter>
      </SettingsWrapperCard>

      {/* Preview skeleton */}
      <div className="hidden lg:block">
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </div>
  )
}
