"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CreateEventButton } from "@/components/events/create-event-button"

interface EventsHeaderProps {
  slug: string
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function EventsHeader({ slug, searchQuery, onSearchChange }: EventsHeaderProps) {
  const t = useTranslations("event")

  // Local state for immediate display, debounced to parent
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

  // Sync local state when prop changes from outside
  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  // Debounce search query updates to parent (300ms delay)
  useEffect(() => {
    if (localSearchQuery === searchQuery) return

    const timer = setTimeout(() => {
      onSearchChange(localSearchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearchQuery, searchQuery, onSearchChange])

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{t("events")}</h1>
        <p className="text-muted-foreground text-sm">
          Manage your events and track RSVPs
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="pl-9 h-9"
          />
          {localSearchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
              onClick={() => setLocalSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <CreateEventButton slug={slug} />
      </div>
    </div>
  )
}
