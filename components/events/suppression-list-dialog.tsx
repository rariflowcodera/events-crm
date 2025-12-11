"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  useSuppressionList,
  useRemoveFromSuppression,
  useAddToSuppression,
} from "@/trpc/hooks/email-delivery-hooks"
import {
  Search,
  Trash2,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Ban,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface SuppressionListDialogProps {
  trigger?: React.ReactNode
}

const reasonBadgeColors: Record<string, string> = {
  HARDBOUNCE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  SOFTBOUNCE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  COMPLAINT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  MANUAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  UNSUBSCRIBE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  UNKNOWN: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

export function SuppressionListDialog({ trigger }: SuppressionListDialogProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(0)
  const [addEmail, setAddEmail] = useState("")
  const [removingId, setRemovingId] = useState<string | null>(null)
  const pageSize = 20

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
    // Simple debounce
    setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }

  const { data, isLoading } = useSuppressionList({
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: page * pageSize,
  })

  const removeMutation = useRemoveFromSuppression()
  const addMutation = useAddToSuppression()

  const handleRemove = async () => {
    if (!removingId) return

    try {
      await removeMutation.mutateAsync({ suppressionId: removingId })
      toast.success("Email removed from suppression list")
      setRemovingId(null)
    } catch (error) {
      toast.error("Failed to remove email from suppression list")
    }
  }

  const handleAdd = async () => {
    if (!addEmail.trim()) return

    try {
      await addMutation.mutateAsync({ email: addEmail.trim() })
      toast.success("Email added to suppression list")
      setAddEmail("")
    } catch (error: unknown) {
      const message =
        error instanceof Error && "message" in error
          ? error.message
          : "Failed to add email"
      toast.error(message)
    }
  }

  const totalPages = Math.ceil((data?.total || 0) / pageSize)

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Ban className="mr-2 h-4 w-4" />
              Manage Suppression List
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Email Suppression List
            </DialogTitle>
            <DialogDescription>
              Emails in this list will not receive any messages. This includes
              addresses that have bounced or complained.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search and Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Add email to suppress..."
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-64"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAdd()
                    }
                  }}
                />
                <Button
                  onClick={handleAdd}
                  disabled={!addEmail.trim() || addMutation.isPending}
                  size="icon"
                >
                  {addMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : data?.suppressions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {debouncedSearch
                          ? "No suppressed emails match your search"
                          : "No suppressed emails"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.suppressions.map((suppression) => (
                      <TableRow key={suppression.id}>
                        <TableCell className="font-medium">
                          {suppression.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              reasonBadgeColors[suppression.reason] || ""
                            }
                          >
                            {suppression.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {suppression.ociCreatedAt
                            ? formatDistanceToNow(
                                new Date(suppression.ociCreatedAt),
                                { addSuffix: true }
                              )
                            : "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRemovingId(suppression.id)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1} -{" "}
                  {Math.min((page + 1) * pageSize, data?.total || 0)} of{" "}
                  {data?.total || 0}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!data?.hasMore}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!removingId}
        onOpenChange={(open) => !open && setRemovingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Suppression List?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow emails to be sent to this address again. If the
              email bounces again, it will be re-added to the suppression list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
