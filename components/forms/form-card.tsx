"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Icons } from "@/components/global/icons"
import {
  useDeleteEventForm,
  useDuplicateEventForm,
  usePublishEventForm,
  useUnpublishEventForm,
} from "@/trpc/hooks/event-forms-hooks"
import { CopyFormToEventsDialog } from "@/components/forms/copy-form-to-events-dialog"
import type { FormPurpose } from "@/lib/schemas"
import type { BilingualText } from "@/server/db/schemas/event-form"

// Helper to get localized text (default to English)
function getLocalizedText(text: BilingualText | null | undefined, locale: string = "en"): string {
  if (!text) return ""
  return (locale === "ar" ? text.ar : text.en) || text.en || ""
}

interface FormCardProps {
  form: {
    id: string
    eventId: string
    name: BilingualText
    slug: string
    description: BilingualText | null
    purpose: FormPurpose | null
    isPublished: boolean
    shortCode: string | null
    responseCount: number
    createdAt: Date
    expiresAt: Date | null
  }
  workspaceSlug: string
  eventSlug: string
}

const purposeIcons: Record<string, typeof Icons.fileText> = {
  travel: Icons.plane,
  survey: Icons.clipboardList,
  feedback: Icons.messageSquare,
  registration: Icons.userPlus,
  custom: Icons.fileText,
}

const purposeColors: Record<string, string> = {
  travel: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  survey: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  feedback: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  registration: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

export function FormCard({ form, workspaceSlug, eventSlug }: FormCardProps) {
  const t = useTranslations()
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)

  const { mutate: deleteForm, isPending: isDeleting } = useDeleteEventForm({
    onSuccess: () => setDeleteDialogOpen(false),
  })

  const { mutate: duplicateForm, isPending: isDuplicating } = useDuplicateEventForm()
  const { mutate: publishForm, isPending: isPublishing } = usePublishEventForm()
  const { mutate: unpublishForm, isPending: isUnpublishing } = useUnpublishEventForm()

  const purpose = form.purpose || "custom"
  const PurposeIcon = purposeIcons[purpose] || Icons.fileText
  const purposeColor = purposeColors[purpose] || purposeColors.custom

  const handleEdit = () => {
    router.push(`/${workspaceSlug}/events/${eventSlug}/forms/${form.slug}`)
  }

  const handleViewResponses = () => {
    router.push(`/${workspaceSlug}/events/${eventSlug}/forms/${form.slug}/responses`)
  }

  const isExpired = form.expiresAt && new Date(form.expiresAt) < new Date()

  return (
    <>
      <Card className="group relative transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${purposeColor}`}>
                <PurposeIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{getLocalizedText(form.name)}</CardTitle>
                {form.description && (
                  <CardDescription className="mt-1 line-clamp-1">
                    {getLocalizedText(form.description)}
                  </CardDescription>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative z-10 h-8 w-8">
                  <Icons.moreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Icons.edit className="mr-2 h-4 w-4" />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewResponses}>
                  <Icons.list className="mr-2 h-4 w-4" />
                  {t("forms.viewResponses")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {form.isPublished ? (
                  <DropdownMenuItem
                    onClick={() => unpublishForm({ formId: form.id })}
                    disabled={isUnpublishing}
                  >
                    <Icons.eyeOff className="mr-2 h-4 w-4" />
                    {t("forms.unpublish")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => publishForm({ formId: form.id })}
                    disabled={isPublishing}
                  >
                    <Icons.eye className="mr-2 h-4 w-4" />
                    {t("forms.publish")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => duplicateForm({ formId: form.id })}
                  disabled={isDuplicating}
                >
                  <Icons.copy className="mr-2 h-4 w-4" />
                  {t("common.duplicate")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCopyDialogOpen(true)}>
                  <Icons.send className="mr-2 h-4 w-4" />
                  {t("forms.copyToEvents")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Icons.trash className="mr-2 h-4 w-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {form.isPublished ? (
                <Badge variant="default" className="bg-green-600">
                  {t("forms.published")}
                </Badge>
              ) : (
                <Badge variant="secondary">{t("forms.draft")}</Badge>
              )}
              {isExpired && (
                <Badge variant="destructive">{t("forms.expired")}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Icons.users className="h-4 w-4" />
              <span>{form.responseCount}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {t("forms.createdAgo", {
              time: formatDistanceToNow(new Date(form.createdAt), { addSuffix: true }),
            })}
          </div>
        </CardContent>

        {/* Clickable overlay for card */}
        <div
          className="absolute inset-0 cursor-pointer rounded-lg"
          onClick={handleEdit}
          aria-hidden="true"
        />
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("forms.deleteFormTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("forms.deleteFormDescription", { name: getLocalizedText(form.name) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteForm({ formId: form.id })}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CopyFormToEventsDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        form={{
          id: form.id,
          name: form.name,
          eventId: form.eventId,
        }}
        workspaceSlug={workspaceSlug}
      />
    </>
  )
}
