"use client"

import { useState } from "react"
import { useUpdateWorkspaceTRPC } from "@/trpc/hooks/workspaces-hooks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { configuration } from "@/lib/config"
import { updateWorkspaceSchema } from "@/lib/schemas"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Icons } from "@/components/global/icons"

type EditWorkspaceUrlFormProps = {
  slug: string
  name: string
  id: string
  canEdit: boolean
}

export function EditWorkspaceUrlForm({ slug, name, id, canEdit }: EditWorkspaceUrlFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<z.infer<typeof updateWorkspaceSchema>>({
    resolver: zodResolver(updateWorkspaceSchema),
    defaultValues: { slug, name, id },
  })

  const { mutate, isPending } = useUpdateWorkspaceTRPC({
    onSuccess: () => {
      form.reset({ ...form.getValues() }, { keepDirty: false, keepValues: true })
      setIsDialogOpen(false)
    },
    onError: () => {
      form.reset({ ...form.getValues() }, { keepDirty: false, keepValues: true })
    },
  })
  const isDirty = form.formState.isDirty

  const onSubmit = (values: z.infer<typeof updateWorkspaceSchema>) => {
    if (!isDirty) {
      return setIsDialogOpen(false)
    }
    mutate(values)
  }

  const isLoading = form.formState.isSubmitting || isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem className="grid grid-cols-2 gap-x-2">
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <div className="group flex">
                    <div className="border-input bg-muted text-muted-foreground inline-flex items-center rounded-l-md border border-r-0 px-3 text-sm lowercase select-none">
                      {configuration.site.domain}/
                    </div>
                    <DialogTrigger disabled={!canEdit}>
                      <div className="relative flex-1">
                        <Input
                          className="truncate rounded-l-none pr-6"
                          disabled={!canEdit}
                          {...field}
                          value={slug}
                        />

                        <div
                          className={cn(
                            "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2",
                            {
                              hidden: !canEdit,
                            }
                          )}
                        >
                          <Icons.pencil className="text-muted-foreground size-3.5 opacity-0 group-hover:opacity-100" />
                          <span className="sr-only">Edit URL</span>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change workspace URL</DialogTitle>
                        <DialogDescription>
                          This will change all your URLs and old ones will be redirected.
                        </DialogDescription>
                      </DialogHeader>
                      <Separator />

                      <div className="grid space-y-2 py-4">
                        <FormLabel>Enter the new workspace URL</FormLabel>
                        <Input
                          disabled={!canEdit || isLoading}
                          {...field}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              form.handleSubmit(onSubmit)()
                            }
                          }}
                        />
                        <FormMessage className="mt-1" />
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant={"secondary"} onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button
                          type="submit"
                          variant="important"
                          disabled={isLoading}
                          onClick={() => form.handleSubmit(onSubmit)()}
                        >
                          Update
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </div>
                </Dialog>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
