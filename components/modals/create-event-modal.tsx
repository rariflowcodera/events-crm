"use client"

import { useTranslations } from "next-intl"

import { useCreateEventModal } from "@/hooks/use-create-event-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CreateEventForm } from "@/components/forms/create-event-form"

export function CreateEventModal() {
  const t = useTranslations("event")
  const { isOpen, close, workspaceSlug } = useCreateEventModal()

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="h-full w-full max-w-full overflow-hidden rounded-xl border sm:max-w-2xl md:mt-6 md:mr-6 md:mb-6 md:h-[calc(100dvh-48px)]">
        <SheetHeader className="sticky -top-6 z-50 pt-12 text-center sm:text-left md:px-6 md:pb-4">
          <SheetTitle className="text-lg">{t("create")}</SheetTitle>
          <SheetDescription>
            Create a new event to start managing guests and RSVPs.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-full">
          <div className="p-6">
            {workspaceSlug && (
              <CreateEventForm workspaceSlug={workspaceSlug} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
