"use client"

import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"
import { useCreateEventModal } from "@/hooks/use-create-event-modal"

interface CreateEventButtonProps {
  slug: string
}

export function CreateEventButton({ slug }: CreateEventButtonProps) {
  const t = useTranslations("event")
  const { open } = useCreateEventModal()

  return (
    <Button onClick={() => open({ workspaceSlug: slug })}>
      <Icons.plus className="mr-2 h-4 w-4" />
      {t("create")}
    </Button>
  )
}
