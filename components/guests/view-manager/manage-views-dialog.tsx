"use client"

import { useState } from "react"
import { Check, Pencil, Trash2 } from "lucide-react"

import { VIEW_COLORS, type ViewColor } from "@/lib/guest-columns"
import { cn } from "@/lib/utils"
import { useGuestListViews } from "@/trpc/hooks/guest-list-views-hooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditViewDialog } from "./edit-view-dialog"
import { DeleteViewDialog } from "./delete-view-dialog"

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  event_staff: "Event Staff",
  member: "Member",
}

// View type for state management
interface ViewData {
  id: string
  name: string
  color: string
  visibleToRoles: string[] | null
  isPinned: boolean
  isSystem: boolean
}

interface ManageViewsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onViewDeleted?: (viewId: string) => void
}

export function ManageViewsDialog({
  open,
  onOpenChange,
  eventId,
  onViewDeleted,
}: ManageViewsDialogProps) {
  const { data: views, isLoading } = useGuestListViews(eventId)
  const [editingView, setEditingView] = useState<ViewData | null>(null)
  const [deletingView, setDeletingView] = useState<{ id: string; name: string } | null>(null)

  // Filter out system views for the table (they can't be edited/deleted in the normal way)
  const customViews = views?.filter((v) => !v.isSystem) ?? []
  const systemViews = views?.filter((v) => v.isSystem) ?? []

  const handleDeleteSuccess = () => {
    if (deletingView) {
      onViewDeleted?.(deletingView.id)
    }
    setDeletingView(null)
  }

  const handleEditDeleted = () => {
    if (editingView) {
      onViewDeleted?.(editingView.id)
    }
    setEditingView(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Views</DialogTitle>
            <DialogDescription>
              Edit or delete your saved views.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Loading views...</span>
            </div>
          ) : customViews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No custom views yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a view from the guests tab to save your column and filter preferences.
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Visible To</TableHead>
                    <TableHead className="w-[80px] text-center">Pinned</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customViews.map((view) => {
                    const colorConfig = VIEW_COLORS[view.color as ViewColor] ?? VIEW_COLORS.gray
                    const roles = view.visibleToRoles ?? []

                    return (
                      <TableRow key={view.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "size-3 rounded-full shrink-0",
                                colorConfig.dot
                              )}
                            />
                            <span className="font-medium truncate">{view.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roles.slice(0, 3).map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {ROLE_LABELS[role] ?? role}
                              </Badge>
                            ))}
                            {roles.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{roles.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {view.isPinned && (
                            <Check className="h-4 w-4 mx-auto text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingView({
                                id: view.id,
                                name: view.name,
                                color: view.color,
                                visibleToRoles: view.visibleToRoles,
                                isPinned: view.isPinned,
                                isSystem: view.isSystem,
                              })}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletingView({ id: view.id, name: view.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {systemViews.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">System Views</p>
              <div className="text-sm text-muted-foreground">
                {systemViews.map((view) => (
                  <div key={view.id} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        VIEW_COLORS[view.color as ViewColor]?.dot ?? "bg-gray-400"
                      )}
                    />
                    <span>{view.name}</span>
                    <Badge variant="outline" className="text-xs ml-1">
                      System
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editingView && (
        <EditViewDialog
          open={!!editingView}
          onOpenChange={(open) => !open && setEditingView(null)}
          view={{
            id: editingView.id,
            name: editingView.name,
            color: editingView.color as ViewColor,
            visibleToRoles: editingView.visibleToRoles ?? [],
            isPinned: editingView.isPinned,
            isSystem: editingView.isSystem,
          }}
          onDeleted={handleEditDeleted}
        />
      )}

      {deletingView && (
        <DeleteViewDialog
          open={!!deletingView}
          onOpenChange={(open) => !open && setDeletingView(null)}
          view={deletingView}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  )
}
