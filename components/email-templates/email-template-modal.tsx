"use client"

import { useTranslations } from "next-intl"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmailTemplateForm } from "@/components/email-templates/email-template-form"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface EmailTemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  templateId: string | null
  categories: GuestCategory[]
  workspaceSlug: string
  eventSlug: string
}

export function EmailTemplateModal({
  open,
  onOpenChange,
  eventId,
  templateId,
  categories,
  workspaceSlug,
  eventSlug,
}: EmailTemplateModalProps) {
  const t = useTranslations("emailTemplate")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="h-full w-full max-w-full overflow-hidden sm:max-w-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>{templateId ? t("edit") : t("create")}</SheetTitle>
          <SheetDescription>
            {templateId
              ? "Update your email template with bilingual support"
              : "Create a new email template with English and Arabic content"}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="px-4 pb-6">
            <EmailTemplateForm
              eventId={eventId}
              templateId={templateId}
              categories={categories}
              workspaceSlug={workspaceSlug}
              eventSlug={eventSlug}
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
