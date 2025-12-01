"use client"

import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/components/global/icons"

type GuestStatus =
  | "pending"
  | "invited"
  | "reminded"
  | "viewed"
  | "confirmed"
  | "declined"
  | "maybe"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
  sortOrder: number
}

type BulkAction = "delete" | "send_invitation" | "send_reminder"

interface GuestsToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: GuestStatus | "all"
  onStatusFilterChange: (status: GuestStatus | "all") => void
  categoryFilter: string | "all"
  onCategoryFilterChange: (categoryId: string | "all") => void
  categories: GuestCategory[]
  selectedCount: number
  onAddGuest: () => void
  onImport: () => void
  onBulkAction: (action: BulkAction) => void
}

const statusOptions: { value: GuestStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "invited", label: "Invited" },
  { value: "reminded", label: "Reminded" },
  { value: "viewed", label: "Viewed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined", label: "Declined" },
  { value: "maybe", label: "Maybe" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No Show" },
]

export function GuestsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  selectedCount,
  onAddGuest,
  onImport,
  onBulkAction,
}: GuestsToolbarProps) {
  const t = useTranslations("guest")

  return (
    <div className="space-y-4">
      {/* Top row: Search and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Icons.search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search guests..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onImport}>
            <Icons.upload className="mr-2 h-4 w-4" />
            {t("import.title")}
          </Button>
          <Button onClick={onAddGuest}>
            <Icons.plus className="mr-2 h-4 w-4" />
            {t("add")}
          </Button>
        </div>
      </div>

      {/* Bottom row: Filters and Bulk Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value as GuestStatus | "all")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {categories.length > 0 && (
            <Select
              value={categoryFilter}
              onValueChange={(value) => onCategoryFilterChange(value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} ({category.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(statusFilter !== "all" || categoryFilter !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange("")
                onStatusFilterChange("all")
                onCategoryFilterChange("all")
              }}
            >
              <Icons.x className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {selectedCount} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("send_invitation")}
            >
              <Icons.mail className="mr-2 h-4 w-4" />
              {t("bulkActions.sendInvitations")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("send_reminder")}
            >
              <Icons.bell className="mr-2 h-4 w-4" />
              {t("bulkActions.sendReminders")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("delete")}
              className="text-destructive hover:text-destructive"
            >
              <Icons.trash className="mr-2 h-4 w-4" />
              {t("bulkActions.delete")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
