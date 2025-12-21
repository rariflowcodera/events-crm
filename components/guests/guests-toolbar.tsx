"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Filter, X, Check, Search, Settings2, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/global/icons"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"
import { ColumnPicker, SaveViewDialog, ViewSelector } from "@/components/guests/view-manager"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { GuestListViewConfig, GuestListViewColumnConfig } from "@/lib/guest-columns"

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

type BulkAction = "delete" | "send_invitation" | "send_email" | "get_form_link"

interface CountryOption {
  code: string
  name: string
}

interface GuestsToolbarProps {
  // Filter props
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
  // Core props
  selectedCount: number
  addGuestHref: string
  importHref: string
  onBulkAction: (action: BulkAction) => void
  onExport?: () => void
  workspaceSlug: string
  // View management props
  eventId: string
  viewConfig?: GuestListViewConfig
  onColumnsChange?: (columns: GuestListViewColumnConfig[]) => void
  // New view management props
  currentViewId?: string | null
  currentViewIsSystem?: boolean
  hasUnsavedChanges?: boolean
  onViewSelect?: (viewId: string | null) => void
  onSaveView?: () => void
  onSetDefault?: () => void
  onEditView?: () => void
  onManageViews?: () => void
  defaultViewId?: string
  // Optional: guest count display
  totalGuests?: number
  filteredCount?: number
}

const STATUS_OPTIONS: { value: GuestStatus; label: string }[] = [
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
  countryFilter,
  onCountryFilterChange,
  availableCountries,
  categories,
  selectedCount,
  addGuestHref,
  importHref,
  onBulkAction,
  onExport,
  workspaceSlug,
  eventId,
  viewConfig,
  onColumnsChange,
  currentViewId,
  currentViewIsSystem,
  hasUnsavedChanges = false,
  onViewSelect,
  onSaveView,
  onSetDefault,
  onEditView,
  onManageViews,
  defaultViewId,
  totalGuests,
  filteredCount,
}: GuestsToolbarProps) {
  const t = useTranslations("guest")
  const { can } = usePermissions(workspaceSlug)
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Permission checks
  const canManageGuests = can(PERMISSIONS.MANAGE_GUESTS)
  const canImportGuests = can(PERMISSIONS.IMPORT_GUESTS)
  const canDeleteGuests = can(PERMISSIONS.DELETE_GUESTS)
  const canSendEmails = can(PERMISSIONS.SEND_EMAILS)
  const canManageEvent = can(PERMISSIONS.MANAGE_EVENT)

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery) count++
    if (statusFilter.length > 0) count++
    if (categoryFilter.length > 0) count++
    if (countryFilter.length > 0) count++
    return count
  }, [searchQuery, statusFilter, categoryFilter, countryFilter])

  // Clear all filters
  const handleClearFilters = () => {
    onSearchChange("")
    onStatusFilterChange([])
    onCategoryFilterChange([])
    onCountryFilterChange([])
  }

  // Category options for filter
  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.id,
        label: cat.name,
        color: cat.color,
      })),
    [categories]
  )

  return (
    <div className="space-y-3">
      {/* Command bar - styled zone */}
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Left zone: View selector + Filters + Columns */}
          <div className="flex items-center gap-2">
            {/* View selector */}
            {onViewSelect && (
              <ViewSelector
                eventId={eventId}
                currentViewId={currentViewId}
                hasUnsavedChanges={hasUnsavedChanges}
                onViewSelect={onViewSelect}
                onSaveView={onSaveView}
                onCreateView={() => setShowSaveViewDialog(true)}
                onManageViews={canManageEvent ? onManageViews : undefined}
                onSetDefault={onSetDefault}
                defaultViewId={defaultViewId}
              />
            )}

            {/* Edit view button - only when a custom view is selected */}
            {currentViewId && canManageEvent && !currentViewIsSystem && onEditView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditView}
                title="Edit View"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}

            {/* Filter toggle button */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <Button
                  variant={activeFilterCount > 0 ? "default" : "ghost"}
                  size="sm"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            {/* Column picker */}
            {viewConfig && onColumnsChange && (
              <ColumnPicker
                columns={viewConfig.columns}
                onColumnsChange={onColumnsChange}
              />
            )}

            {/* Separator + Guest count */}
            <div className="h-4 w-px bg-border" />
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {activeFilterCount > 0 && filteredCount !== undefined
                ? `${filteredCount} filtered`
                : totalGuests !== undefined
                  ? `${totalGuests} guest${totalGuests !== 1 ? "s" : ""}`
                  : null}
            </span>
          </div>

          {/* Center zone: Selection actions (only when items selected) */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium whitespace-nowrap">
                {selectedCount} selected
              </span>
              <div className="h-4 w-px bg-border" />
              {canSendEmails && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => onBulkAction("send_invitation")}
                >
                  <Icons.mail className="mr-1 h-4 w-4" />
                  <span className="hidden lg:inline">Invite</span>
                </Button>
              )}
              {canSendEmails && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => onBulkAction("send_email")}
                >
                  <Icons.mail className="mr-1 h-4 w-4" />
                  <span className="hidden lg:inline">Email</span>
                </Button>
              )}
              {selectedCount === 1 && canSendEmails && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => onBulkAction("get_form_link")}
                >
                  <FileText className="mr-1 h-4 w-4" />
                  <span className="hidden lg:inline">{t("formLink")}</span>
                </Button>
              )}
              {canDeleteGuests && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive hover:text-destructive"
                  onClick={() => onBulkAction("delete")}
                >
                  <Icons.trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Right zone: Primary actions */}
          <div className="flex items-center gap-2">
            {onExport && (
              <Button variant="ghost" size="sm" onClick={onExport}>
                <Icons.download className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">{t("export")}</span>
              </Button>
            )}
            {canImportGuests && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={importHref}>
                  <Icons.upload className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">{t("import.title")}</span>
                </Link>
              </Button>
            )}
            {canManageGuests && (
              <Button size="sm" asChild>
                <Link href={addGuestHref}>
                  <Icons.plus className="mr-1 h-4 w-4" />
                  {t("add")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible filter row */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
            {/* Search input */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search guests..."
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={() => onSearchChange("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Status filter */}
            <MultiSelectFilter
              value={statusFilter}
              onChange={onStatusFilterChange as (values: string[]) => void}
              options={STATUS_OPTIONS}
              placeholder="Status"
              searchPlaceholder="Search status..."
            />

            {/* Category filter */}
            {categoryOptions.length > 0 && (
              <MultiSelectFilter
                value={categoryFilter}
                onChange={onCategoryFilterChange}
                options={categoryOptions}
                placeholder="Category"
                searchPlaceholder="Search category..."
              />
            )}

            {/* Country filter */}
            {availableCountries.length > 0 && (
              <MultiSelectFilter
                value={countryFilter}
                onChange={onCountryFilterChange}
                options={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
                placeholder="Country"
                searchPlaceholder="Search country..."
              />
            )}

            {/* Clear all button */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear all
                <X className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Save View Dialog */}
      {viewConfig && (
        <SaveViewDialog
          open={showSaveViewDialog}
          onOpenChange={setShowSaveViewDialog}
          eventId={eventId}
          config={viewConfig}
        />
      )}
    </div>
  )
}

// Multi-select filter component
interface MultiSelectFilterProps {
  value: string[]
  onChange: (values: string[]) => void
  options: { value: string; label: string; color?: string | null }[]
  placeholder: string
  searchPlaceholder?: string
}

function MultiSelectFilter({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const selectedSet = useMemo(() => new Set(value), [value])

  const handleToggle = (optionValue: string) => {
    const newSet = new Set(selectedSet)
    if (newSet.has(optionValue)) {
      newSet.delete(optionValue)
    } else {
      newSet.add(optionValue)
    }
    onChange(Array.from(newSet))
  }

  const handleClear = () => {
    onChange([])
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 min-w-[100px] justify-start",
            value.length > 0 && "border-primary"
          )}
        >
          <span className="truncate">
            {value.length > 0 ? `${placeholder} (${value.length})` : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">{placeholder}</span>
            {value.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleClear}
              >
                Clear
                <X className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedSet.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleToggle(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    {option.color && (
                      <div
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
