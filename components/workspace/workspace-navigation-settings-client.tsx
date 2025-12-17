"use client"

import { useState, useEffect, Suspense } from "react"
import { useTranslations } from "next-intl"
import { ErrorBoundary } from "react-error-boundary"

import { trpc } from "@/trpc/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/global/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"
import { toast } from "sonner"
import type { NavigationSettings } from "@/server/db/schemas/workspace"

const roles = ["owner", "admin", "manager", "event_staff", "member"] as const

const eventNavItems = [
  { key: "overview", labelKey: "nav.overview" },
  { key: "guests", labelKey: "guest.guests" },
  { key: "categories", labelKey: "guest.categories" },
  { key: "forms", labelKey: "forms.title" },
  { key: "branding", labelKey: "branding.title" },
  { key: "emails", labelKey: "email.templates" },
  { key: "reports", labelKey: "rsvpReports.reports" },
  { key: "settings", labelKey: "common.settings" },
] as const

// Default visibility for each navigation item by role
const defaultVisibility: Record<string, string[]> = {
  overview: ["owner", "admin", "manager", "event_staff", "member"],
  guests: ["owner", "admin", "manager", "event_staff", "member"],
  categories: ["owner", "admin", "manager"],
  forms: ["owner", "admin", "manager"],
  branding: ["owner", "admin", "manager"],
  emails: ["owner", "admin", "manager"],
  reports: ["owner", "admin", "manager", "member"],
  settings: ["owner", "admin"],
}

interface WorkspaceNavigationSettingsClientProps {
  slug: string
}

export function WorkspaceNavigationSettingsClient({ slug }: WorkspaceNavigationSettingsClientProps) {
  return (
    <Suspense fallback={<NavigationSettingsSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={error.message || "An error occurred loading navigation settings"}
            icon="alertTriangle"
          />
        )}
      >
        <NavigationSettingsSuspense slug={slug} />
      </ErrorBoundary>
    </Suspense>
  )
}

function NavigationSettingsSuspense({ slug }: { slug: string }) {
  const t = useTranslations()
  const utils = trpc.useUtils()

  const [workspace] = trpc.workspaces.getOne.useSuspenseQuery({ slug })
  const [navSettingsData] = trpc.workspaces.getNavigationSettings.useSuspenseQuery({ slug })

  // Initialize local state from server data or defaults
  const [settings, setSettings] = useState<NavigationSettings["eventNav"]>(() => {
    const serverSettings = navSettingsData.navigationSettings?.eventNav
    if (serverSettings && Object.keys(serverSettings).length > 0) {
      return serverSettings
    }
    // Use defaults if no settings saved
    return defaultVisibility as NavigationSettings["eventNav"]
  })

  const [hasChanges, setHasChanges] = useState(false)

  // Update settings when server data changes
  useEffect(() => {
    const serverSettings = navSettingsData.navigationSettings?.eventNav
    if (serverSettings && Object.keys(serverSettings).length > 0) {
      setSettings(serverSettings)
    }
  }, [navSettingsData.navigationSettings?.eventNav])

  const updateMutation = trpc.workspaces.updateNavigationSettings.useMutation({
    onSuccess: () => {
      toast.success("Navigation settings saved")
      setHasChanges(false)
      utils.workspaces.getNavigationSettings.invalidate({ slug })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save navigation settings")
    },
  })

  const toggleRole = (itemKey: string, role: string) => {
    setSettings((prev) => {
      const currentRoles = prev?.[itemKey as keyof typeof prev] ?? defaultVisibility[itemKey] ?? []
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter((r) => r !== role)
        : [...currentRoles, role]

      return {
        ...prev,
        [itemKey]: newRoles,
      }
    })
    setHasChanges(true)
  }

  const handleSave = () => {
    updateMutation.mutate({
      workspaceId: workspace.workspace.id,
      navigationSettings: {
        eventNav: settings,
      },
    })
  }

  const handleReset = () => {
    setSettings(defaultVisibility as NavigationSettings["eventNav"])
    setHasChanges(true)
  }

  const isRoleEnabled = (itemKey: string, role: string) => {
    const itemRoles = settings?.[itemKey as keyof typeof settings] ?? defaultVisibility[itemKey] ?? []
    return itemRoles.includes(role)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.sidebar className="size-5" />
            Event Navigation Visibility
          </CardTitle>
          <CardDescription>
            Control which navigation items are visible to each role when viewing an event.
            Owners always have access to all items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left font-medium">Navigation Item</th>
                  {roles.map((role) => (
                    <th key={role} className="pb-3 text-center font-medium">
                      {t(`views.roles.${role}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventNavItems.map((item) => (
                  <tr key={item.key} className="border-b last:border-0">
                    <td className="py-3 text-sm">{t(item.labelKey)}</td>
                    {roles.map((role) => (
                      <td key={role} className="py-3 text-center">
                        <Checkbox
                          checked={isRoleEnabled(item.key, role)}
                          onCheckedChange={() => toggleRole(item.key, role)}
                          disabled={role === "owner"} // Owner always has access
                          aria-label={`${t(item.labelKey)} visible to ${role}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={updateMutation.isPending}
            >
              <Icons.refresh className="mr-2 size-4" />
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Icons.spinner className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icons.check className="mr-2 size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">About Navigation Visibility</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            <strong>Owner:</strong> Full access to all navigation items. Cannot be disabled.
          </p>
          <p>
            <strong>Admin:</strong> Typically has access to all items except workspace-level settings.
          </p>
          <p>
            <strong>Manager:</strong> Event operations access - guests, categories, forms, emails, reports.
          </p>
          <p>
            <strong>Member:</strong> View-only access - typically overview, guests, and reports.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function NavigationSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-8">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="size-4" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
