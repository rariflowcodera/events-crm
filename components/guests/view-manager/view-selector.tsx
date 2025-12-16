"use client"

import { Check, ChevronDown, Plus, Save, Settings2, Star } from "lucide-react"

import { VIEW_COLORS, type ViewColor } from "@/lib/guest-columns"
import { cn } from "@/lib/utils"
import { useGuestListViews } from "@/trpc/hooks/guest-list-views-hooks"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ViewSelectorProps {
  eventId: string
  currentViewId?: string | null
  hasUnsavedChanges?: boolean
  onViewSelect: (viewId: string | null) => void
  onSaveView?: () => void
  onCreateView: () => void
  onManageViews?: () => void
  onSetDefault?: () => void
  defaultViewId?: string
}

export function ViewSelector({
  eventId,
  currentViewId,
  hasUnsavedChanges = false,
  onViewSelect,
  onSaveView,
  onCreateView,
  onManageViews,
  onSetDefault,
  defaultViewId,
}: ViewSelectorProps) {
  const { data: views, isLoading } = useGuestListViews(eventId)

  const currentView = views?.find((v) => v.id === currentViewId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          <span className="flex items-center gap-2 truncate">
            {currentView ? (
              <>
                <span
                  className={cn(
                    "size-2 rounded-full flex-shrink-0",
                    VIEW_COLORS[currentView.color as ViewColor]?.dot ||
                      "bg-gray-400"
                  )}
                />
                <span className="truncate">{currentView.name}</span>
                {hasUnsavedChanges && (
                  <span className="size-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                )}
              </>
            ) : (
              <>
                <span>All Guests</span>
                {hasUnsavedChanges && (
                  <span className="size-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                )}
              </>
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuItem onClick={() => onViewSelect(null)}>
          <span className="flex-1">All Guests</span>
          {!currentViewId && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>

        {views && views.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {views.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => onViewSelect(view.id)}
              >
                <span
                  className={cn(
                    "size-2 rounded-full mr-2 flex-shrink-0",
                    VIEW_COLORS[view.color as ViewColor]?.dot || "bg-gray-400"
                  )}
                />
                <span className="flex-1 truncate">{view.name}</span>
                {defaultViewId === view.id && (
                  <Star className="ml-1 h-3.5 w-3.5 flex-shrink-0 text-yellow-500 fill-yellow-500" />
                )}
                {currentViewId === view.id && (
                  <Check className="ml-auto h-4 w-4 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />

        {/* Save current view (only when a view is selected and has changes) */}
        {currentViewId && onSaveView && (
          <DropdownMenuItem
            onClick={onSaveView}
            disabled={!hasUnsavedChanges}
            className={cn(!hasUnsavedChanges && "opacity-50")}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </DropdownMenuItem>
        )}

        {/* Set as Default (only when a view is selected and not already default) */}
        {currentViewId && onSetDefault && currentViewId !== defaultViewId && (
          <DropdownMenuItem onClick={onSetDefault}>
            <Star className="mr-2 h-4 w-4" />
            Set as Default
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={onCreateView}>
          <Plus className="mr-2 h-4 w-4" />
          Save As New View
        </DropdownMenuItem>

        {onManageViews && (
          <DropdownMenuItem onClick={onManageViews}>
            <Settings2 className="mr-2 h-4 w-4" />
            Manage Views
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
