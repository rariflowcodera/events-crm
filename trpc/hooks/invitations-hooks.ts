import { trpc } from "@/trpc/client"
import { toast } from "sonner"

type UseCreateInvitationTRPCType = {
  onSuccess?: () => void
}

export const useCreateInvitationTRPC = ({ onSuccess }: UseCreateInvitationTRPCType) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.invitations.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message, {
        description: data.description,
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.invitations.getMany.invalidate()
    },
  })

  return { mutate, isPending }
}

export const useCreateBulkInvitationTRPC = ({ onSuccess }: UseCreateInvitationTRPCType) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.invitations.createBulk.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.invitations.getMany.invalidate()
    },
  })

  return { mutate, isPending }
}

export const useRevokeInvitationTRPC = () => {
  const utils = trpc.useUtils()
  const { mutate, isPending } = trpc.invitations.revoke.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.invitations.getMany.invalidate()
    },
  })

  return { mutate, isPending }
}

export const useDeleteInvitationTRPC = () => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.invitations.delete.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.invitations.getMany.invalidate()
    },
  })

  return { mutate, isPending }
}

export const useDeclineInvitationTRPC = () => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.invitations.decline.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.invitations.getMany.invalidate()
    },
  })

  return { mutate, isPending }
}
