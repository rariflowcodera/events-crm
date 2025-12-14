"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/global/icons"
import { EventOverviewTab } from "@/components/events/event-overview-tab"
import { EventGuestsTab } from "@/components/events/event-guests-tab"
import { EventCategoriesTab } from "@/components/events/event-categories-tab"
import { EventEmailsTab } from "@/components/email-templates/event-emails-tab"
import { EventReportsTab } from "@/components/events/event-reports-tab"
import { EventSettingsTab } from "@/components/events/event-settings-tab"
import { EventFormsTab } from "@/components/events/event-forms-tab"
import { EventBrandingTab } from "@/components/events/event-branding-tab"

type EventStatus = "draft" | "planning" | "invitations_sent" | "rsvp_open" | "rsvp_closed" | "in_progress" | "completed" | "cancelled"

interface GuestCategory {
  id: string
  name: string
  code: string
  description: string | null
  color: string | null
  sortOrder: number
  defaultEmailTemplateId: string | null
}

interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  eventType: string | null
  venue: string | null
  venueAddress: string | null
  startDate: Date | null
  endDate: Date | null
  rsvpDeadline: Date | null
  maxGuests: number | null
  status: EventStatus
  branding: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
  } | null
  settings: {
    allowPlusOne?: boolean
    maxPlusOnes?: number
    requireApproval?: boolean
    sendReminders?: boolean
    reminderDays?: number[]
  } | null
  guestCategories: GuestCategory[]
  createdAt: Date
  // Custom domain fields
  customDomain: string | null
  customDomainVerified: boolean | null
  customDomainVerificationToken: string | null
}

interface EventTabsProps {
  event: Event
  workspaceSlug: string
}

type TabValue = "overview" | "guests" | "categories" | "forms" | "branding" | "emails" | "reports" | "settings"

const validTabs: TabValue[] = ["overview", "guests", "categories", "forms", "branding", "emails", "reports", "settings"]

export function EventTabs({ event, workspaceSlug }: EventTabsProps) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read initial tab from URL params, default to "overview"
  const tabFromUrl = searchParams.get("tab") as TabValue | null
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "overview"
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab)

  // Sync tab with URL when navigating back
  // Note: We use tabFromUrl (a string) as the dependency, not searchParams (an object)
  // because useSearchParams() returns a new object reference on each render
  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl, activeTab])

  // Update both state and URL when tab changes
  const handleTabChange = useCallback((newTab: TabValue) => {
    setActiveTab(newTab)
    // Update URL without adding to history stack (replace, not push)
    router.replace(`${pathname}?tab=${newTab}`, { scroll: false })
  }, [router, pathname])

  const tabs = [
    {
      value: "overview" as const,
      label: "Overview",
      icon: Icons.dashboard,
    },
    {
      value: "guests" as const,
      label: t("guest.guests"),
      icon: Icons.users,
    },
    {
      value: "categories" as const,
      label: t("guest.categories"),
      icon: Icons.layers,
    },
    {
      value: "forms" as const,
      label: t("forms.title"),
      icon: Icons.formInput,
    },
    {
      value: "branding" as const,
      label: t("branding.title"),
      icon: Icons.brush,
    },
    {
      value: "emails" as const,
      label: t("email.templates"),
      icon: Icons.mail,
    },
    {
      value: "reports" as const,
      label: t("rsvpReports.reports"),
      icon: Icons.chart,
    },
    {
      value: "settings" as const,
      label: t("common.settings"),
      icon: Icons.settings,
    },
  ]

  return (
    <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabValue)}>
      <TabsList className="w-full justify-start border-b bg-transparent p-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Icon className="mr-2 h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          )
        })}
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <EventOverviewTab event={event} workspaceSlug={workspaceSlug} />
      </TabsContent>

      <TabsContent value="guests" className="mt-6">
        <EventGuestsTab event={event} workspaceSlug={workspaceSlug} />
      </TabsContent>

      <TabsContent value="categories" className="mt-6">
        <EventCategoriesTab event={event} workspaceSlug={workspaceSlug} />
      </TabsContent>

      <TabsContent value="forms" className="mt-6">
        <EventFormsTab event={event} workspaceSlug={workspaceSlug} />
      </TabsContent>

      <TabsContent value="branding" className="mt-6">
        <EventBrandingTab event={event} workspaceSlug={workspaceSlug} />
      </TabsContent>

      <TabsContent value="emails" className="mt-6">
        <EventEmailsTab event={event} workspaceSlug={workspaceSlug} />
      </TabsContent>

      <TabsContent value="reports" className="mt-6">
        <EventReportsTab event={event} workspaceSlug={workspaceSlug} />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <EventSettingsTab event={event} workspaceSlug={workspaceSlug} />
      </TabsContent>
    </Tabs>
  )
}
