"use client"

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TextFilter } from "./text-filter"
import { SelectFilter } from "./select-filter"
import { CountryFilter } from "./country-filter"
import type { ColumnFilterType } from "@/lib/guest-columns"

interface SelectOption {
  value: string
  label: string
  color?: string
}

interface ColumnHeaderWithFilterProps<T> {
  column: Column<T, unknown>
  title: string
  filterType?: ColumnFilterType
  filterKey?: string
  filterValue?: string | string[] | boolean
  onFilterChange?: (key: string, value: string | string[] | boolean | undefined) => void
  filterOptions?: SelectOption[]
  availableCountries?: { code: string; name: string }[]
}

export function ColumnHeaderWithFilter<T>({
  column,
  title,
  filterType,
  filterKey,
  filterValue,
  onFilterChange,
  filterOptions = [],
  availableCountries = [],
}: ColumnHeaderWithFilterProps<T>) {
  const isSorted = column.getIsSorted()
  const canSort = column.getCanSort()
  const isFilterable = !!filterType && !!filterKey && !!onFilterChange

  // Determine if filter has a value
  const hasFilterValue =
    filterValue !== undefined &&
    filterValue !== "" &&
    (Array.isArray(filterValue) ? filterValue.length > 0 : true)

  // Handle filter change
  const handleTextFilterChange = (value: string) => {
    if (!filterKey || !onFilterChange) return
    onFilterChange(filterKey, value || undefined)
  }

  const handleSelectFilterChange = (value: string[]) => {
    if (!filterKey || !onFilterChange) return
    onFilterChange(filterKey, value.length > 0 ? value : undefined)
  }

  const handleCountryFilterChange = (value: string[]) => {
    if (!filterKey || !onFilterChange) return
    onFilterChange(filterKey, value.length > 0 ? value : undefined)
  }

  const handleBooleanFilterChange = (value: string[]) => {
    if (!filterKey || !onFilterChange) return
    // Convert string array to boolean or undefined
    if (value.length === 0) {
      onFilterChange(filterKey, undefined)
    } else if (value.includes("true") && !value.includes("false")) {
      onFilterChange(filterKey, true)
    } else if (value.includes("false") && !value.includes("true")) {
      onFilterChange(filterKey, false)
    } else {
      // Both selected = no filter
      onFilterChange(filterKey, undefined)
    }
  }

  // Render the appropriate filter component
  const renderFilter = () => {
    if (!isFilterable) return null

    switch (filterType) {
      case "text":
        return (
          <TextFilter
            value={typeof filterValue === "string" ? filterValue : ""}
            onChange={handleTextFilterChange}
            placeholder={`Filter ${title.toLowerCase()}...`}
            label={title}
          />
        )
      case "select":
        return (
          <SelectFilter
            value={Array.isArray(filterValue) ? filterValue : []}
            onChange={handleSelectFilterChange}
            options={filterOptions}
            label={title}
            searchPlaceholder={`Search ${title.toLowerCase()}...`}
          />
        )
      case "country":
        return (
          <CountryFilter
            value={Array.isArray(filterValue) ? filterValue : []}
            onChange={handleCountryFilterChange}
            availableCountries={availableCountries}
            label={title}
          />
        )
      case "boolean":
        return (
          <SelectFilter
            value={
              filterValue === true ? ["true"] :
              filterValue === false ? ["false"] :
              []
            }
            onChange={handleBooleanFilterChange}
            options={[
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ]}
            label={title}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-1">
      {canSort ? (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-7 px-2 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(isSorted === "asc")}
        >
          <span className="truncate">{title}</span>
          {isSorted === "desc" ? (
            <ArrowDown className="ml-1 h-4 w-4 flex-shrink-0" />
          ) : isSorted === "asc" ? (
            <ArrowUp className="ml-1 h-4 w-4 flex-shrink-0" />
          ) : (
            <ArrowUpDown className="ml-1 h-4 w-4 flex-shrink-0 opacity-50" />
          )}
        </Button>
      ) : (
        <span className="truncate">{title}</span>
      )}
      {renderFilter()}
    </div>
  )
}
