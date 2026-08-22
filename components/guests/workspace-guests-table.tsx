"use client"

import { useState } from "react"
import Link from "next/link"

import { createRoute } from "@/lib/routes"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/global/icons"
import { AddGuestToEventModal } from "@/components/guests/add-guest-to-event-modal"

interface Participation {
  guestId: string
  eventId: string
  eventName: string
  eventSlug: string
  eventStatus: string
  status: string
  categoryId: string
  categoryName: string
  categoryColor: string | null
}

interface DirectoryEntry {
  key: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  country: string | null
  profileImage: string | null
  participations: Participation[]
}

interface WorkspaceEvent {
  id: string
  name: string
  slug: string
}

interface WorkspaceGuestsTableProps {
  entries: DirectoryEntry[]
  workspaceSlug: string
  workspaceEvents: WorkspaceEvent[]
}

export function WorkspaceGuestsTable({
  entries,
  workspaceSlug,
  workspaceEvents,
}: WorkspaceGuestsTableProps) {
  const [addToEventEntry, setAddToEventEntry] = useState<DirectoryEntry | null>(null)

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Events</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const fullName = [entry.firstName, entry.lastName].filter(Boolean).join(" ")
              const initials = (entry.firstName?.[0] ?? "") + (entry.lastName?.[0] ?? "")

              return (
                <TableRow key={entry.key}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={entry.profileImage ?? undefined} alt={fullName} />
                        <AvatarFallback>{initials.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{fullName || "Unnamed guest"}</div>
                        {entry.country && (
                          <div className="text-xs text-muted-foreground">{entry.country}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{entry.email || "—"}</div>
                    {entry.phone && (
                      <div className="text-xs text-muted-foreground">{entry.phone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.participations.map((p) => (
                        <Link
                          key={p.guestId}
                          href={
                            createRoute("guest-detail", {
                              slug: workspaceSlug,
                              eventSlug: p.eventSlug,
                              guestId: p.guestId,
                            }).href
                          }
                        >
                          <Badge variant="secondary" className="font-normal hover:bg-secondary/80">
                            {p.eventName}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddToEventEntry(entry)}
                    >
                      <Icons.plus className="size-3.5" />
                      Add to Event
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {addToEventEntry && (
        <AddGuestToEventModal
          isOpen={!!addToEventEntry}
          onClose={() => setAddToEventEntry(null)}
          entry={addToEventEntry}
          workspaceEvents={workspaceEvents}
        />
      )}
    </>
  )
}
