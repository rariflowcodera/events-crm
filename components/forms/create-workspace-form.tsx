"use client"

import { useState } from "react"
import { useCreateWorkspaceTRPC } from "@/trpc/hooks/workspaces-hooks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { configuration } from "@/lib/config"
import { workspaceSchema } from "@/lib/schemas"
import { cn } from "@/lib/utils"
import { useCreateWorkspaceModal } from "@/hooks/use-create-workspace-modal"
import { Button } from "@/components/ui/button"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"
import { ImageUpload, ImageUploadSkeleton } from "@/components/global/image-upload"
import { InvitationMailPreview } from "@/components/invitation/invitation-mail-preview"

type CreateWorkspaceFormProps = {
  className?: string
  hasAnimation?: boolean
  children?: React.ReactNode
  hasMailPreview?: boolean
}

export function CreateWorkspaceForm({
  className,
  hasAnimation = true,
  hasMailPreview = false,
}: CreateWorkspaceFormProps) {
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false)

  const { userImage, userName, workspaceLogo, workspaceName } = useCreateWorkspaceModal()

  const form = useForm<z.infer<typeof workspaceSchema>>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      slug: "",
      logo: "",
    },
  })

  const { mutate, isPending } = useCreateWorkspaceTRPC()

  const isDirty = form.formState.isDirty

  const onSubmit = (values: z.infer<typeof workspaceSchema>) => {
    if (!isDirty) {
      return toast.info("No changes to update")
    }
    mutate(values)
  }

  const isLoading = form.formState.isSubmitting || isPending
  const isDisabledForm = isPending || isLoading

  return (
    <div
      className={cn("", {
        "flex flex-col gap-20 md:flex-row": hasMailPreview,
      })}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn("flex flex-col gap-y-4", className, {
            "animate-fade-in": hasAnimation,
          })}
        >
          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Logo</FormLabel>
                <FormControl>
                  <ImageUpload
                    type="logo"
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value)
                    }}
                    showActions={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Workspace name</FormLabel>
                <FormControl>
                  <Input
                    className="bg-card dark:bg-background"
                    placeholder="eg: Netflix"
                    disabled={isLoading}
                    autoFocus
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      if (!isSlugManuallyEdited) {
                        const slug = e.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/[^\w\s-]/g, "")
                          .replace(/\s+/g, "-")
                          .replace(/-+/g, "-")
                        form.setValue("slug", slug, { shouldDirty: true })
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Workspace URL</FormLabel>
                <FormControl>
                  <div className="flex">
                    <div className="border-input bg-muted text-muted-foreground inline-flex items-center rounded-l-md border border-r-0 px-3 text-sm lowercase select-none">
                      {configuration.site.domain}/
                    </div>
                    <Input
                      disabled={isLoading}
                      placeholder="eg: netflix"
                      {...field}
                      className="bg-card dark:bg-background rounded-l-none"
                      onChange={(e) => {
                        setIsSlugManuallyEdited(true)
                        const value = e.target.value
                          .toLowerCase()
                          .replace(/[^\w\s-]/g, "")
                          .replace(/\s+/g, "-")
                          .replace(/-+/g, "-")
                        field.onChange(value)
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isDisabledForm} className="mt-3 w-full">
            {isPending ? (
              <>
                <Icons.loader className="animate-spin" />
                Creating...
              </>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </form>
      </Form>

      {hasMailPreview && (
        <div className="flex h-full flex-col gap-4 px-6 pb-46 md:pr-6 md:pl-0">
          <p className="text-sm font-medium">Email preview</p>
          <InvitationMailPreview
            user={{ name: userName, image: userImage }}
            workspace={{
              name: form.watch("name") ?? workspaceName,
              logo: form.watch("logo") ?? workspaceLogo,
            }}
          />
        </div>
      )}
    </div>
  )
}

export function CreateWorkspaceFormSkeleton() {
  return (
    <div className="space-y-8">
      <ImageUploadSkeleton />

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>

        <Separator />

        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
