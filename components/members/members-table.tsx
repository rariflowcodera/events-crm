"use client"

import { useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { UserWithRoleType } from "@/types/types"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/global/table-pagination"

interface MembersTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enablePagination?: boolean
  enableSearch?: boolean
}

export function MembersTable<TData, TValue>({
  columns,
  data,
  enablePagination = false,
  enableSearch = false,
}: MembersTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    filterFns: {
      customFilter: (row, id, filterValue) => {
        const value = String(row.getValue(id) || "").toLowerCase()
        return value.includes(String(filterValue).toLowerCase())
      },
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const value = String(row.getValue(columnId) || "").toLowerCase()
      return value.includes(String(filterValue).toLowerCase())
    },
    state: {
      columnFilters,
      globalFilter,
    },
    ...(enablePagination && {
      getPaginationRowModel: getPaginationRowModel(),
    }),
  })

  return (
    <div className="grid gap-y-4">
      {enableSearch && (
        <div className="flex items-center">
          <Input
            placeholder="Search by name or email..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-xs"
          />
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="sr-only">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const user = row.original as UserWithRoleType

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn("", {
                      "opacity-20 select-none": user.status === "inactive",
                    })}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="bg-os-background-100 dark:bg-os-background-200 py-3 first:rounded-l-lg last:rounded-r-lg"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-16 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
  )
}

export function MembersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Members</p>
        <Skeleton className="mt-1 h-3 w-72" />
      </div>
      <div className="bg-os-background-100 w-full space-y-0.5 divide-y rounded-md border p-2">
        <div className="flex items-center justify-between p-2 py-3">
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-x-2">
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <div className="flex items-center justify-between p-2 py-3">
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-x-2">
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <div className="flex items-center justify-between p-2 py-3">
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-x-2">
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}
