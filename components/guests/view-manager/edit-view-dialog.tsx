"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Trash2 } from "lucide-react"
import { z } from "zod"

import { type ViewColor } from "@/lib/guest-columns"
import { useUpdateGuestListView } from "@/trpc/hooks/guest-list-views-hooks"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ViewColorPicker } from "./view-color-picker"
import { ViewRoleSelector } from "./view-role-selector"
import { DeleteViewDialog } from "./delete-view-dialog"

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z.enum(["gray", "blue", "green", "orange", "purple", "red"]),
  visibleToRoles: z
    .array(z.enum(["owner", "admin", "manager", "event_staff", "member"]))
    .min(1, "At least one role must be selected"),
  isPinned: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface EditViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: {
    id: string
    name: string
    color: ViewColor
    visibleToRoles: string[]
    isPinned: boolean
    isSystem: boolean
  }
  onDeleted?: () => void
}

export function EditViewDialog({
  open,
  onOpenChange,
  view,
  onDeleted,
}: EditViewDialogProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { mutate: updateView, isPending } = useUpdateGuestListView({
    onSuccess: () => {
      onOpenChange(false)
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: view.name,
      color: view.color,
      visibleToRoles: view.visibleToRoles as FormValues["visibleToRoles"],
      isPinned: view.isPinned,
    },
  })

  // Reset form when view changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: view.name,
        color: view.color,
        visibleToRoles: view.visibleToRoles as FormValues["visibleToRoles"],
        isPinned: view.isPinned,
      })
    }
  }, [open, view, form])

  const onSubmit = (values: FormValues) => {
    updateView({
      viewId: view.id,
      name: values.name,
      color: values.color,
      visibleToRoles: values.visibleToRoles,
      isPinned: values.isPinned,
    })
  }

  const handleDeleteSuccess = () => {
    setShowDeleteDialog(false)
    onOpenChange(false)
    onDeleted?.()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit View</DialogTitle>
            <DialogDescription>
              Update the view settings.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>View Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Confirmed VIPs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <ViewColorPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a color to categorize this view
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visibleToRoles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visible to</FormLabel>
                    <FormControl>
                      <ViewRoleSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Select which roles can see this view in the sidebar
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPinned"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Pin to sidebar</FormLabel>
                      <FormDescription>
                        Show this view in the sidebar menu for quick access
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                {!view.isSystem && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete View
                  </Button>
                )}
                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 sm:flex-initial"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 sm:flex-initial"
                  >
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteViewDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        view={view}
        onSuccess={handleDeleteSuccess}
      />
    </>
  )
}
