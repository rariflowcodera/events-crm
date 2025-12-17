import { useRouter } from "next/navigation"
import { WorkspaceType } from "@/server/db/schema-types"
import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { createRoute } from "@/lib/routes"

export const useUpdateMemberTRPC = ({ slug }: { slug: WorkspaceType["slug"] }) => {
  const utils = trpc.useUtils()
  const { mutate, isPending } = trpc.members.update.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.members.getMany.invalidate({ slug })
    },
  })

  return { mutate, isPending }
}

export const useDeleteMemberTRPC = ({ slug }: { slug: WorkspaceType["slug"] }) => {
  const utils = trpc.useUtils()
  const { mutate, isPending } = trpc.members.delete.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.members.getMany.invalidate({ slug })
    },
  })

  return { mutate, isPending }
}

export const useLeaveWorkspaceTRPC = ({ slug }: { slug: WorkspaceType["slug"] }) => {
  const utils = trpc.useUtils()
  const router = useRouter()
  const { mutate, isPending } = trpc.members.leave.useMutation({
    onSuccess: (data) => {
      toast.success(data.message, {
        description: data.description,
      })

      router.push(createRoute("callback").href)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.members.getMany.invalidate({ slug })
    },
  })

  return { mutate, isPending }
}

type ResetPasswordResult = {
  message: string
  email: string
  generatedPassword: string
}

type UseResetPasswordTRPCProps = {
  slug: WorkspaceType["slug"]
  onSuccess?: (data: ResetPasswordResult) => void
}

export const useResetPasswordTRPC = ({ slug, onSuccess }: UseResetPasswordTRPCProps) => {
  const { mutate, isPending } = trpc.members.resetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    // Note: We intentionally don't invalidate members.getMany here because:
    // 1. Password reset doesn't change member list data
    // 2. Invalidating would cause component re-render and lose the credentials dialog state
  })

  return { mutate, isPending }
}
