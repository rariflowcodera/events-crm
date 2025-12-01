"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { FileText, Building2, Users, Trophy, Landmark, Heart, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { useRsvpTemplates, useApplyTemplateToEvent } from "@/trpc/hooks/rsvp-templates-hooks"
import type { RsvpFormTemplateCategory } from "@/server/db/schemas/rsvp-form-template"

interface TemplatePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceSlug: string
  eventId: string
  onSuccess?: () => void
}

const CATEGORY_ICONS: Record<RsvpFormTemplateCategory, React.ComponentType<{ className?: string }>> = {
  corporate: Building2,
  conference: Users,
  gala: Sparkles,
  sports: Trophy,
  government: Landmark,
  wedding: Heart,
  custom: FileText,
}

const CATEGORY_LABELS: Record<RsvpFormTemplateCategory, string> = {
  corporate: "Corporate",
  conference: "Conference",
  gala: "Gala",
  sports: "Sports",
  government: "Government",
  wedding: "Wedding",
  custom: "Custom",
}

export function TemplatePickerDialog({
  open,
  onOpenChange,
  workspaceSlug,
  eventId,
  onSuccess,
}: TemplatePickerDialogProps) {
  const t = useTranslations("rsvpFormBuilder")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const { data: templates, isLoading } = useRsvpTemplates(workspaceSlug, {
    includeSystem: true,
  })

  const { mutate: applyTemplate, isPending: isApplying } = useApplyTemplateToEvent({
    onSuccess: () => {
      onOpenChange(false)
      setSelectedTemplateId(null)
      onSuccess?.()
    },
  })

  const handleApply = () => {
    if (selectedTemplateId) {
      applyTemplate({ templateId: selectedTemplateId, eventId })
    }
  }

  // Group templates by category
  const groupedTemplates = (templates || []).reduce(
    (acc, template) => {
      const category = template.category || "custom"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(template)
      return acc
    },
    {} as Record<string, typeof templates>
  )

  // Sort categories: system templates first, then by category name
  const sortedCategories = Object.keys(groupedTemplates).sort((a, b) => {
    // Put "custom" last
    if (a === "custom") return 1
    if (b === "custom") return -1
    return a.localeCompare(b)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t("selectTemplate")}</DialogTitle>
          <DialogDescription>
            {t("selectTemplateDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="grid gap-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-6">
              {sortedCategories.map((category) => {
                const categoryTemplates = groupedTemplates[category]
                if (!categoryTemplates || categoryTemplates.length === 0) return null

                const Icon = CATEGORY_ICONS[category as RsvpFormTemplateCategory] || FileText

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium text-sm">
                        {CATEGORY_LABELS[category as RsvpFormTemplateCategory] || category}
                      </h3>
                    </div>
                    <div className="grid gap-2">
                      {categoryTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          className={cn(
                            "w-full text-left rounded-lg border p-4 transition-colors hover:bg-muted/50",
                            selectedTemplateId === template.id && "border-primary bg-primary/5"
                          )}
                          onClick={() => setSelectedTemplateId(template.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{template.name}</span>
                                {template.isSystem && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {t("systemTemplate")}
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-sm text-muted-foreground">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border-2 shrink-0 mt-1",
                                selectedTemplateId === template.id
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/30"
                              )}
                            >
                              {selectedTemplateId === template.id && (
                                <div className="h-full w-full flex items-center justify-center">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                              {template.config.sections.filter((s) => s.enabled).length} {t("sections")}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {template.config.sections.reduce(
                                (sum, s) =>
                                  sum +
                                  s.standardFields.filter((f) => f.enabled).length +
                                  s.customFields.length,
                                0
                              )}{" "}
                              {t("fields")}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("noTemplatesAvailable")}</p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleApply} disabled={!selectedTemplateId || isApplying}>
            {isApplying ? t("applying") : t("applyTemplate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
