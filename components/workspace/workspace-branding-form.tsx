"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { WorkspaceBranding } from "@/server/db/schemas/workspace"
import { useUpdateWorkspaceBranding } from "@/trpc/hooks/workspaces-hooks"

import { workspaceBrandingSchema } from "@/lib/schemas"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"
import { ColorPicker, LogoUploadGroup, BrandingPreview } from "@/components/branding"
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

  const form = useForm<FormValues>({
    resolver: zodResolver(workspaceBrandingSchema),
    defaultValues: {
      logo: branding.logo || "",
      logoDark: branding.logoDark || "",
      primaryColor: branding.primaryColor || "",
      accentColor: branding.accentColor || "",
      primaryColorDark: branding.primaryColorDark || "",
      accentColorDark: branding.accentColorDark || "",
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
      },
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Form Card */}
      <SettingsWrapperCard className="max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-semibold">
                Workspace Branding
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

            <CardFooter className="flex justify-between border-t pt-4">
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
            </CardFooter>
          </form>
        </Form>
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
    </div>
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
