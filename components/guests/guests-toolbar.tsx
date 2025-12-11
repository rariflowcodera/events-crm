"use client"

import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import MultipleSelector, { Option } from "@/components/ui/multiselect"
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

type BulkAction = "delete" | "send_invitation" | "send_email"

interface CountryOption {
  code: string
  name: string
}

interface GuestsToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: GuestStatus[]
  onStatusFilterChange: (statuses: GuestStatus[]) => void
  categoryFilter: string[]
  onCategoryFilterChange: (categoryIds: string[]) => void
  countryFilter: string[]
  onCountryFilterChange: (countries: string[]) => void
  availableCountries: CountryOption[]
  categories: GuestCategory[]
  selectedCount: number
  onAddGuest: () => void
  onImport: () => void
  onBulkAction: (action: BulkAction) => void
}

const statusOptions: Option[] = [
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

// Helper to convert status array to Option array
const statusToOptions = (statuses: GuestStatus[]): Option[] =>
  statuses.map((s) => statusOptions.find((o) => o.value === s)!).filter(Boolean)

export function GuestsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  countryFilter,
  onCountryFilterChange,
  availableCountries,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-row flex-wrap items-start gap-2">
          <div className="w-[200px]">
            <MultipleSelector
              options={statusOptions}
              value={statusToOptions(statusFilter)}
              onChange={(options) =>
                onStatusFilterChange(options.map((o) => o.value as GuestStatus))
              }
              placeholder="Filter by status"
              hidePlaceholderWhenSelected
              badgeClassName="bg-muted"
            />
          </div>

          {categories.length > 0 && (
            <div className="w-[200px]">
              <MultipleSelector
                options={categories.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
                value={categoryFilter.map((id) => {
                  const cat = categories.find((c) => c.id === id)
                  return cat ? { value: cat.id, label: `${cat.name} (${cat.code})` } : null
                }).filter(Boolean) as Option[]}
                onChange={(options) =>
                  onCategoryFilterChange(options.map((o) => o.value))
                }
                placeholder="Filter by category"
                hidePlaceholderWhenSelected
                badgeClassName="bg-muted"
              />
            </div>
          )}

          {availableCountries.length > 0 && (
            <div className="w-[200px]">
              <MultipleSelector
                options={availableCountries.map((c) => ({
                  value: c.code,
                  label: c.name,
                }))}
                value={countryFilter.map((code) => {
                  const country = availableCountries.find((c) => c.code === code)
                  return country ? { value: country.code, label: country.name } : null
                }).filter(Boolean) as Option[]}
                onChange={(options) =>
                  onCountryFilterChange(options.map((o) => o.value))
                }
                placeholder="Filter by country"
                hidePlaceholderWhenSelected
                badgeClassName="bg-muted"
              />
            </div>
          )}

          {(statusFilter.length > 0 || categoryFilter.length > 0 || countryFilter.length > 0 || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange("")
                onStatusFilterChange([])
                onCategoryFilterChange([])
                onCountryFilterChange([])
              }}
              className="h-[38px]"
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
              onClick={() => onBulkAction("send_email")}
            >
              <Icons.mail className="mr-2 h-4 w-4" />
              {t("bulkActions.sendEmail")}
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
