"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import { useEmailTemplates, useDeleteEmailTemplate, useDuplicateEmailTemplate, useImportDefaultTemplates } from "@/trpc/hooks/email-hooks"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyPlaceholder } from "@/components/global/empty-placeholder"
import { Icons } from "@/components/global/icons"
import { createRoute } from "@/lib/routes"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { BilingualEmailContent } from "@/server/db/schemas/email-template"
import { EmailDeliveryDashboard } from "@/components/events/email-delivery-dashboard"
import { DocumentLibrary } from "@/components/documents"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface Event {
  id: string
  name: string
  slug: string
  guestCategories: GuestCategory[]
}

interface EventEmailsTabProps {
  event: Event
  workspaceSlug: string
}

type EmailTemplateType =
  | "invitation"
  | "reminder"
  | "confirmation"
  | "declined_acknowledgment"
  | "update"
  | "cancellation"
  | "custom"

interface EmailTemplate {
  id: string
  eventId: string
  name: string
  type: EmailTemplateType
  categoryId: string | null
  content: BilingualEmailContent
  defaultLanguage: string
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date | null
  category: {
    id: string
    name: string
    code: string
    color: string | null
  } | null
}

const templateTypeColors: Record<EmailTemplateType, string> = {
  invitation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  reminder: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  confirmation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  declined_acknowledgment: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  update: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  cancellation: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  custom: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
}

export function EventEmailsTab({ event, workspaceSlug }: EventEmailsTabProps) {
  const t = useTranslations("emailTemplate")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const { can } = usePermissions(workspaceSlug)
  const canManageTemplates = can(PERMISSIONS.MANAGE_TEMPLATES)

  // State
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deliveryOpen, setDeliveryOpen] = useState(false)

  // Navigation hrefs
  const addTemplateHref = createRoute("template-new", { slug: workspaceSlug, eventSlug: event.slug }).href
  const getTemplateDetailHref = useCallback(
    (templateId: string) => createRoute("template-detail", { slug: workspaceSlug, eventSlug: event.slug, templateId }).href,
    [workspaceSlug, event.slug]
  )

  // Data fetching
  const { data: templates, isLoading } = useEmailTemplates({ eventId: event.id })

  // Mutations
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteEmailTemplate({
    onSuccess: () => {
      setDeletingTemplate(null)
      router.refresh()
    },
  })

  const { mutate: duplicateTemplate, isPending: isDuplicating } = useDuplicateEmailTemplate({
    onSuccess: (data) => {
      // Navigate to the new template's edit page
      router.push(getTemplateDetailHref(data.id))
    },
  })

  const { mutate: importDefaults, isPending: isImporting } = useImportDefaultTemplates({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(t("importDefaultsSuccess", { created: data.created, skipped: data.skipped }))
      } else {
        toast.info(t("importDefaultsNone"))
      }
    },
  })

  // Handlers
  const handleDeleteTemplate = useCallback(() => {
    if (!deletingTemplate) return
    deleteTemplate({ templateId: deletingTemplate.id })
  }, [deletingTemplate, deleteTemplate])

  const handleDuplicateTemplate = useCallback(
    (templateId: string) => {
      duplicateTemplate({ templateId })
    },
    [duplicateTemplate]
  )

  const handleImportDefaults = useCallback(() => {
    importDefaults({ eventId: event.id })
  }, [importDefaults, event.id])

  // Filter templates
  const filteredTemplates = (templates as EmailTemplate[] | undefined)?.filter((template) => {
    if (typeFilter !== "all" && template.type !== typeFilter) return false
    if (categoryFilter !== "all" && template.categoryId !== categoryFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = template.name.toLowerCase().includes(query)
      const matchesSubject = template.content.en.subject.toLowerCase().includes(query)
      if (!matchesName && !matchesSubject) return false
    }
    return true
  })

  // Format relative date
  const formatRelativeDate = (date: Date | null) => {
    if (!date) return ""
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Email Delivery Dashboard - Collapsible */}
      <Collapsible open={deliveryOpen} onOpenChange={setDeliveryOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardContent className="py-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.chart className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">Email Delivery Stats</h4>
                    <p className="text-sm text-muted-foreground">
                      View bounce rates, delivery status, and suppression list
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    deliveryOpen && "rotate-180"
                  )}
                />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-6 py-6">
              <EmailDeliveryDashboard eventId={event.id} />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Document Library - Collapsible */}
      <DocumentLibrary
        eventId={event.id}
        categories={event.guestCategories}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("title")}</h3>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        {canManageTemplates && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleImportDefaults}
              disabled={isImporting}
            >
              {isImporting && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
              <Icons.download className="mr-2 h-4 w-4" />
              {t("importDefaults")}
            </Button>
            <Button asChild>
              <Link href={addTemplateHref}>
                <Icons.plus className="mr-2 h-4 w-4" />
                {t("create")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="invitation">{t("types.invitation")}</SelectItem>
            <SelectItem value="reminder">{t("types.reminder")}</SelectItem>
            <SelectItem value="confirmation">{t("types.confirmation")}</SelectItem>
            <SelectItem value="declined_acknowledgment">{t("types.declined_acknowledgment")}</SelectItem>
            <SelectItem value="update">{t("types.update")}</SelectItem>
            <SelectItem value="cancellation">{t("types.cancellation")}</SelectItem>
            <SelectItem value="custom">{t("types.custom")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {event.guestCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Icons.search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Template List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates && filteredTemplates.length > 0 ? (
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs font-medium", templateTypeColors[template.type])}
                      >
                        {t(`types.${template.type}`)}
                      </Badge>
                      <span className="font-medium">{template.name}</span>
                      {template.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          {t("isDefault")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Subject: {template.content.en.subject}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {template.category && (
                        <span className="flex items-center gap-1.5">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: template.category.color || "#6366f1" }}
                          />
                          {template.category.name}
                        </span>
                      )}
                      <span>{t("lastUpdated")}: {formatRelativeDate(template.updatedAt || template.createdAt)}</span>
                      <div className="flex items-center gap-1">
                        {template.content.en && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            EN
                          </Badge>
                        )}
                        {template.content.ar?.htmlContent && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            AR
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {canManageTemplates && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Icons.actions className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={getTemplateDetailHref(template.id)}>
                            <Icons.edit className="mr-2 h-4 w-4" />
                            {t("edit")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicateTemplate(template.id)}
                          disabled={isDuplicating}
                        >
                          <Icons.copy className="mr-2 h-4 w-4" />
                          {t("duplicate")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingTemplate(template)}
                        >
                          <Icons.trash className="mr-2 h-4 w-4" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10">
            <EmptyPlaceholder>
              <EmptyPlaceholder.Icon name="mail" />
              <EmptyPlaceholder.Title>{t("noTemplates")}</EmptyPlaceholder.Title>
              <EmptyPlaceholder.Description>{t("noTemplatesDescription")}</EmptyPlaceholder.Description>
              {canManageTemplates && (
                <Button asChild className="mt-4">
                  <Link href={addTemplateHref}>
                    <Icons.plus className="mr-2 h-4 w-4" />
                    {t("createFirst")}
                  </Link>
                </Button>
              )}
            </EmptyPlaceholder>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDelete")}
              <br />
              <span className="font-medium">{deletingTemplate?.name}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
