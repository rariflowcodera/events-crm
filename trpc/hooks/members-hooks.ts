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
