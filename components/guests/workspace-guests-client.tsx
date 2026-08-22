"use client"

import { useState, useMemo } from "react"

import { useWorkspaceGuests } from "@/trpc/hooks/guests-hooks"
import { useEvents } from "@/trpc/hooks/events-hooks"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"
import { EmptyPlaceholder } from "@/components/global/empty-placeholder"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkspaceGuestsTable } from "@/components/guests/workspace-guests-table"

const PAGE_SIZE = 50

interface WorkspaceGuestsClientProps {
  slug: string
}

export function WorkspaceGuestsClient({ slug }: WorkspaceGuestsClientProps) {
  const [search, setSearch] = useState("")
  const [offset, setOffset] = useState(0)

  const { data, isLoading, error } = useWorkspaceGuests({
    workspaceSlug: slug,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const { data: events } = useEvents(slug)

  const entries = data?.entries ?? []
  const total = data?.total ?? 0
  const hasMore = data?.hasMore ?? false

  const workspaceEvents = useMemo(
    () =>
      (events ?? []).map((event) => ({
        id: event.id,
        name: event.name,
        slug: event.slug,
      })),
    [events]
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setOffset(0)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="alertTriangle" />
            <EmptyPlaceholder.Title>Failed to load guests</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>{error.message}</EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        </CardContent>
      </Card>
    )
  }

  const hasGuests = total > 0 || entries.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Guest Directory</h1>
          <p className="text-sm text-muted-foreground">
            Every guest across all events in this workspace, in one place.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Icons.search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or organization..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <WorkspaceGuestsTableSkeleton />
      ) : hasGuests ? (
        <>
          <WorkspaceGuestsTable entries={entries} workspaceSlug={slug} workspaceEvents={workspaceEvents} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {entries.length} of {total} {total === 1 ? "guest" : "guests"}
            </span>
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
              >
                Load more
              </Button>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-10">
            <EmptyPlaceholder>
              <EmptyPlaceholder.Icon name="users" />
              <EmptyPlaceholder.Title>
                {search ? "No guests match your search" : "No guests yet"}
              </EmptyPlaceholder.Title>
              <EmptyPlaceholder.Description>
                {search
                  ? "Try a different search term."
                  : "Guests you add to your events will show up here."}
              </EmptyPlaceholder.Description>
            </EmptyPlaceholder>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function WorkspaceGuestsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="flex items-center border-b bg-background h-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-2 flex-1">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center border-b h-14">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="p-2 flex-1">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
