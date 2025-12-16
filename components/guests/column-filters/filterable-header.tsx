"use client"

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

interface FilterableHeaderProps<T> {
  column: Column<T, unknown>
  title: string
}

export function FilterableHeader<T>({
  column,
  title,
}: FilterableHeaderProps<T>) {
  const isSorted = column.getIsSorted()
  const canSort = column.getCanSort()

  return (
    <div className="flex items-center gap-1">
      {canSort ? (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(isSorted === "asc")}
        >
          <span>{title}</span>
          {isSorted === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : isSorted === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ) : (
        <span>{title}</span>
      )}
    </div>
  )
}
