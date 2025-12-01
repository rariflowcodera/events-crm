"use client"

import { UserType, WorkspaceType } from "@/server/db/schema-types"
import { useCreateInvitationTRPC } from "@/trpc/hooks/invitations-hooks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { invitationSchema } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ActionTooltip } from "@/components/global/action-tooltip"
import { Icons } from "@/components/global/icons"
import { SettingsWrapperCard } from "@/components/layout/settings-wrapper"

type MemberInviteFormProps = {
  workspaceId: WorkspaceType["id"]
  currentUser: Pick<UserType, "name" | "lastName" | "image">
}

export function CreateInviteForm({ currentUser, workspaceId }: MemberInviteFormProps) {
  const form = useForm<z.infer<typeof invitationSchema>>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "member",
      workspaceId,
      invitedBy: `${currentUser.name} ${currentUser.lastName}`,
      invitedByProfileImage: currentUser.image ?? "",
    },
  })

  const { mutate, isPending } = useCreateInvitationTRPC({
    onSuccess: () => {
      form.reset()
    },
  })

  const isDirty = form.formState.isDirty

  const onSubmit = async (values: z.infer<typeof invitationSchema>) => {
    if (!isDirty) {
      return toast.error("No email provided")
    }

    mutate(values)
  }

  const isLoading = form.formState.isSubmitting || isPending

  return (
    <div className="space-y-4">
      <SettingsWrapperCard>
        <CardHeader className="flex flex-row justify-between">
          <div className="space-y-2">
            <CardTitle>Invite</CardTitle>
            <CardDescription>Invite a new member by email address</CardDescription>
          </div>
          <div className="flex items-center justify-end">
            <ActionTooltip
              contentClassName="flex-col text-xs w-56"
              label="Roles"
              content={
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">Member</p>
                    <p className="">Can view and interact with workspace content</p>
                  </div>
                  <div>
                    <p className="font-semibold">Admin</p>
                    <p className="">Can manage workspace settings and members</p>
                  </div>
                </div>
              }
            >
              <Button variant="ghost" size="icon" className="size-auto">
                <Icons.info className="text-muted-foreground" />
              </Button>
            </ActionTooltip>
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="flex items-start gap-x-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="example@email.com" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.loader className="animate-spin" />
                    Sending invite...
                  </>
                ) : (
                  "Invite"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </SettingsWrapperCard>
    </div>
  )
}

export function CreateInviteFormSkeleton() {
  return (
    <div className="space-y-4">
      <SettingsWrapperCard className="space-y-10">
        <CardHeader className="flex flex-row justify-between">
          <div className="space-y-2">
            <CardTitle>Invite</CardTitle>
            <CardDescription>Invite a new member by email address</CardDescription>
          </div>
          <div className="flex items-center justify-end">
            <ActionTooltip
              contentClassName="flex-col text-xs w-56"
              label="Roles"
              content={
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">Member</p>
                    <p className="">Can view and interact with workspace content</p>
                  </div>
                  <div>
                    <p className="font-semibold">Admin</p>
                    <p className="">Can manage workspace settings and members</p>
                  </div>
                </div>
              }
            >
              <Button variant="ghost" size="icon" className="size-auto">
                <Icons.info className="text-muted-foreground" />
              </Button>
            </ActionTooltip>
          </div>
        </CardHeader>
        <CardContent className="flex items-start gap-x-2">
          <Skeleton className="h-9 w-10/12" />
          <Skeleton className="h-9 w-2/12" />
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-center justify-end">
            <Skeleton className="h-7 w-32" />
          </div>
        </CardFooter>
      </SettingsWrapperCard>
    </div>
  )
}
