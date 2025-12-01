"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

import { emailTemplateTypeValues } from "@/lib/schemas"
import {
  useEmailTemplates,
  useDefaultEmailTemplates,
  useSetDefaultEmailTemplate,
} from "@/trpc/hooks/email-hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"

interface EmailConfigurationCardProps {
  eventId: string
  eventSlug: string
  workspaceSlug: string
}

// Email types that are relevant for bulk sending
const EMAIL_TYPES = [
  {
    value: "invitation" as const,
    labelKey: "invitation",
    descriptionKey: "invitationDescription",
  },
  {
    value: "reminder" as const,
    labelKey: "reminder",
    descriptionKey: "reminderDescription",
  },
  {
    value: "confirmation" as const,
    labelKey: "confirmation",
    descriptionKey: "confirmationDescription",
  },
  {
    value: "declined_acknowledgment" as const,
    labelKey: "declined_acknowledgment",
    descriptionKey: "declinedDescription",
  },
  {
    value: "update" as const,
    labelKey: "update",
    descriptionKey: "updateDescription",
  },
  {
    value: "cancellation" as const,
    labelKey: "cancellation",
    descriptionKey: "cancellationDescription",
  },
] as const

type EmailType = (typeof emailTemplateTypeValues)[number]

export function EmailConfigurationCard({
  eventId,
  eventSlug,
  workspaceSlug,
}: EmailConfigurationCardProps) {
  const t = useTranslations("emailConfig")
  const tTypes = useTranslations("emailTemplate.types")

  // Fetch default templates (currently assigned)
  const { data: defaultTemplates, isLoading: loadingDefaults } =
    useDefaultEmailTemplates(eventId)

  // Fetch all templates for this event (for dropdown options)
  const { data: allTemplates, isLoading: loadingAll } = useEmailTemplates({
    eventId,
  })

  // Mutation to set default template
  const { mutate: setDefault, isPending } = useSetDefaultEmailTemplate()

  // Group templates by type for dropdown options (only event-level, no category)
  const templatesByType = useMemo(() => {
    if (!allTemplates) return {} as Record<EmailType, typeof allTemplates>

    const grouped: Record<string, typeof allTemplates> = {}

    for (const type of emailTemplateTypeValues) {
      grouped[type] = allTemplates.filter(
        (t) => t.type === type && !t.categoryId
      )
    }

    return grouped as Record<EmailType, typeof allTemplates>
  }, [allTemplates])

  const isLoading = loadingDefaults || loadingAll

  const handleSelect = (type: EmailType, templateId: string | null) => {
    setDefault({
      eventId,
      type,
      templateId,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {EMAIL_TYPES.map(({ value: type, labelKey, descriptionKey }) => (
          <EmailTypeRow
            key={type}
            type={type}
            label={tTypes(labelKey)}
            description={t(descriptionKey)}
            currentTemplate={defaultTemplates?.[type]}
            availableTemplates={templatesByType[type] || []}
            onSelect={(templateId) => handleSelect(type, templateId)}
            isLoading={isLoading}
            isPending={isPending}
          />
        ))}

        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {t("createNew")}{" "}
            <Link
              href={`/${workspaceSlug}/events/${eventSlug}?tab=emails`}
              className="text-primary hover:underline"
            >
              {t("goToEmails")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface EmailTypeRowProps {
  type: EmailType
  label: string
  description: string
  currentTemplate?: {
    id: string
    name: string
    content: {
      en: { subject: string }
      ar?: { subject?: string }
    }
    updatedAt: Date | null
  }
  availableTemplates: Array<{
    id: string
    name: string
    content: {
      en: { subject: string }
      ar?: { subject?: string }
    }
  }>
  onSelect: (templateId: string | null) => void
  isLoading: boolean
  isPending: boolean
}

function EmailTypeRow({
  type,
  label,
  description,
  currentTemplate,
  availableTemplates,
  onSelect,
  isLoading,
  isPending,
}: EmailTypeRowProps) {
  const t = useTranslations("emailConfig")

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const hasTemplates = availableTemplates.length > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">{label}</label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <Select
        value={currentTemplate?.id || "none"}
        onValueChange={(value) => onSelect(value === "none" ? null : value)}
        disabled={isPending || !hasTemplates}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("selectTemplate")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">{t("noTemplate")}</span>
          </SelectItem>
          {availableTemplates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Show current template info or warning */}
      {currentTemplate ? (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Icons.check className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium">{t("subject")}:</span>{" "}
            {currentTemplate.content.en.subject}
            {currentTemplate.updatedAt && (
              <span className="ml-2">
                ({t("updated")} {formatDistanceToNow(new Date(currentTemplate.updatedAt), { addSuffix: true })})
              </span>
            )}
          </div>
        </div>
      ) : hasTemplates ? (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <Icons.alertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t("noTemplateWarning", { type: label.toLowerCase() })}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icons.info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t("noTemplatesAvailable")}</span>
        </div>
      )}
    </div>
  )
}
