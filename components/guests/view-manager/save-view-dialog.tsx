"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { type GuestListViewConfig, type ViewColor } from "@/lib/guest-columns"
import { useCreateGuestListView } from "@/trpc/hooks/guest-list-views-hooks"
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

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z.enum(["gray", "blue", "green", "orange", "purple", "red"]),
  visibleToRoles: z
    .array(z.enum(["owner", "admin", "manager", "event_staff", "member"]))
    .min(1, "At least one role must be selected"),
  isPinned: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface SaveViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  config: GuestListViewConfig
}

export function SaveViewDialog({
  open,
  onOpenChange,
  eventId,
  config,
}: SaveViewDialogProps) {
  const { mutate: createView, isPending } = useCreateGuestListView({
    onSuccess: () => {
      onOpenChange(false)
      form.reset()
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "gray",
      visibleToRoles: ["owner", "admin", "manager", "event_staff", "member"],
      isPinned: true,
    },
  })

  const onSubmit = (values: FormValues) => {
    createView({
      eventId,
      name: values.name,
      config,
      color: values.color,
      visibleToRoles: values.visibleToRoles,
      isPinned: values.isPinned,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save View</DialogTitle>
          <DialogDescription>
            Save the current column and filter configuration as a named view.
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save View"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
