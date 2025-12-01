import { WorkspaceType } from "@/server/db/schema-types"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ActionTooltip } from "@/components/global/action-tooltip"
import { BreadCrumbList } from "@/components/global/bread-crumb-list"

type BreadcrumbsProps = {
  slug: WorkspaceType["slug"]
}

export async function Breadcrumbs({ slug }: BreadcrumbsProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-2"
      aria-label="Navigation breadcrumbs"
    >
      <div className="flex h-full shrink-0 items-center gap-x-2">
        <ActionTooltip
          label="Toggle Sidebar (⌘B)"
          side="right"
          delayDuration={500}
        >
          <SidebarTrigger className="-ml-1" />
        </ActionTooltip>
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <BreadCrumbList />
      </div>
    </header>
  )
}
