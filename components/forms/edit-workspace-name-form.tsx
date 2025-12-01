"use client"

import { useCallback, useRef } from "react"
import { WorkspaceType } from "@/server/db/schema-types"
import { useUpdateWorkspaceTRPC } from "@/trpc/hooks/workspaces-hooks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { updateWorkspaceSchema } from "@/lib/schemas"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/global/icons"

type EditWorkspaceNameFormProps = {
  slug: WorkspaceType["slug"]
  name: WorkspaceType["name"]
  id: WorkspaceType["id"]
  canEdit: boolean
}

export function EditWorkspaceNameForm({ slug, name, id, canEdit }: EditWorkspaceNameFormProps) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const form = useForm<z.infer<typeof updateWorkspaceSchema>>({
    resolver: zodResolver(updateWorkspaceSchema),
    defaultValues: { slug, name, id },
  })

  const { mutate, isPending } = useUpdateWorkspaceTRPC({
    onSuccess: () => {
      form.reset({ ...form.getValues() }, { keepDirty: false, keepValues: true })
    },
    onError: () => {
      form.reset({ ...form.getValues() }, { keepDirty: false, keepValues: true })
    },
  })

  const onSubmit = useCallback(
    (values: z.infer<typeof updateWorkspaceSchema>) => {
      mutate(values)
    },
    [mutate]
  )

  const handleFieldBlur = useCallback(
    (fieldName: "name") => {
      if (form.getFieldState(fieldName as keyof z.infer<typeof updateWorkspaceSchema>).isDirty) {
        // Clear any existing timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        // Debounce the submission (300ms is a good balance)
        debounceTimerRef.current = setTimeout(() => {
          onSubmit(form.getValues())
          debounceTimerRef.current = null
        }, 150)
      }
    },
    [form, onSubmit]
  )

  const isLoading = form.formState.isSubmitting || isPending

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="grid grid-cols-2 gap-x-2">
              <FormLabel>Workspace name</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    disabled={!canEdit || isLoading}
                    {...field}
                    onBlur={() => canEdit && handleFieldBlur("name")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        if (canEdit) handleFieldBlur("name")
                      }
                    }}
                  />
                  {isLoading && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2">
                      <Icons.loader className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
