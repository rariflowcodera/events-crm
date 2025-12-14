"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"
import { createRoute } from "@/lib/routes"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"

interface CreateEventButtonProps {
  slug: string
}

export function CreateEventButton({ slug }: CreateEventButtonProps) {
  const t = useTranslations("event")
  const { can, isLoading } = usePermissions(slug)
  const createEventHref = createRoute("event-create", { slug }).href

  // Don't show button if user lacks permission
  if (isLoading || !can(PERMISSIONS.CREATE_EVENT)) {
    return null
  }

  return (
    <Button asChild>
      <Link href={createEventHref}>
        <Icons.plus className="mr-2 h-4 w-4" />
        {t("create")}
      </Link>
    </Button>
  )
}
