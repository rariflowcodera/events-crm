"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { createRoute } from "@/lib/routes"
import { useDuplicateEvent } from "@/trpc/hooks/events-hooks"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/global/icons"

interface DuplicateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: {
    id: string
    name: string
  }
  workspaceSlug: string
}

interface DuplicationOption {
  key: string
  label: string
  description: string
  checked: boolean
  dependsOnCategories?: boolean
}

export function DuplicateEventDialog({
  open,
  onOpenChange,
  event,
  workspaceSlug,
}: DuplicateEventDialogProps) {
  const t = useTranslations("events.duplicate")
  const router = useRouter()

  // Form state
  const [name, setName] = useState(`${event.name} (Copy)`)
  const [options, setOptions] = useState<DuplicationOption[]>([
    {
      key: "includeCategories",
      label: t("options.categories"),
      description: t("options.categoriesDesc"),
      checked: true,
    },
    {
      key: "includeEmailTemplates",
      label: t("options.emailTemplates"),
      description: t("options.emailTemplatesDesc"),
      checked: true,
      dependsOnCategories: true,
    },
    {
      key: "includeGuestListViews",
      label: t("options.guestListViews"),
      description: t("options.guestListViewsDesc"),
      checked: true,
      dependsOnCategories: true,
    },
    {
      key: "includeEventForms",
      label: t("options.eventForms"),
      description: t("options.eventFormsDesc"),
      checked: true,
      dependsOnCategories: true,
    },
    {
      key: "includeDocuments",
      label: t("options.documents"),
      description: t("options.documentsDesc"),
      checked: true,
      dependsOnCategories: true,
    },
    {
      key: "includeItineraries",
      label: t("options.itineraries"),
      description: t("options.itinerariesDesc"),
      checked: true,
      dependsOnCategories: true,
    },
    {
      key: "includeInventoryTypes",
      label: t("options.inventoryTypes"),
      description: t("options.inventoryTypesDesc"),
      checked: true,
    },
    {
      key: "includeWorkflows",
      label: t("options.workflows"),
      description: t("options.workflowsDesc"),
      checked: true,
      dependsOnCategories: true,
    },
  ])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(`${event.name} (Copy)`)
      setOptions((prev) => prev.map((opt) => ({ ...opt, checked: true })))
    }
  }, [open, event.name])

  // Duplicate mutation
  const { mutate: duplicateEvent, isPending } = useDuplicateEvent({
    onSuccess: (data) => {
      onOpenChange(false)
      // Navigate to the new event
      router.push(
        createRoute("event-detail", {
          slug: workspaceSlug,
          eventSlug: data.event.slug,
        }).href
      )
    },
  })

  // Handle option toggle
  const handleOptionChange = (key: string, checked: boolean) => {
    setOptions((prev) => {
      const newOptions = prev.map((opt) => {
        if (opt.key === key) {
          return { ...opt, checked }
        }
        return opt
      })

      // If enabling a dependent option, ensure categories is enabled
      if (checked) {
        const option = prev.find((o) => o.key === key)
        if (option?.dependsOnCategories) {
          return newOptions.map((opt) =>
            opt.key === "includeCategories" ? { ...opt, checked: true } : opt
          )
        }
      }

      // If disabling categories, disable all dependent options
      if (key === "includeCategories" && !checked) {
        return newOptions.map((opt) =>
          opt.dependsOnCategories ? { ...opt, checked: false } : opt
        )
      }

      return newOptions
    })
  }

  // Handle submit
  const handleSubmit = () => {
    const optionsMap = options.reduce(
      (acc, opt) => {
        acc[opt.key] = opt.checked
        return acc
      },
      {} as Record<string, boolean>
    )

    duplicateEvent({
      eventId: event.id,
      name: name.trim() || undefined,
      options: {
        includeCategories: optionsMap.includeCategories,
        includeEmailTemplates: optionsMap.includeEmailTemplates,
        includeGuestListViews: optionsMap.includeGuestListViews,
        includeEventForms: optionsMap.includeEventForms,
        includeDocuments: optionsMap.includeDocuments,
        includeItineraries: optionsMap.includeItineraries,
        includeInventoryTypes: optionsMap.includeInventoryTypes,
        includeWorkflows: optionsMap.includeWorkflows,
        includeMasterTemplates: true, // Always include master templates
      },
    })
  }

  // Check if categories are disabled but dependent options are checked
  const categoriesOption = options.find((o) => o.key === "includeCategories")
  const hasDependentOptionsChecked = options.some(
    (o) => o.dependsOnCategories && o.checked
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Name Input */}
          <div className="space-y-2">
            <Label htmlFor="event-name">{t("name")}</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={isPending}
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">{t("includeLabel")}</Label>
            <div className="space-y-3">
              {options.map((option) => {
                // Categories option is disabled if dependent options are checked
                const isDisabled =
                  isPending ||
                  (option.key === "includeCategories" && hasDependentOptionsChecked)

                return (
                  <div key={option.key} className="flex items-start space-x-3">
                    <Checkbox
                      id={option.key}
                      checked={option.checked}
                      onCheckedChange={(checked) =>
                        handleOptionChange(option.key, !!checked)
                      }
                      disabled={isDisabled}
                    />
                    <div className="grid gap-0.5 leading-none">
                      <label
                        htmlFor={option.key}
                        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                          isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                        }`}
                      >
                        {option.label}
                      </label>
                      <p className="text-muted-foreground text-xs">
                        {option.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? (
              <>
                <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting", { defaultValue: "Duplicating..." })}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
