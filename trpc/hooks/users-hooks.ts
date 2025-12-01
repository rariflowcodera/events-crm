import { useRouter } from "next/navigation"
import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { signOut } from "@/lib/auth-client"
import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"
import { createRoute } from "@/lib/routes"
import { useEditProfileModal } from "@/hooks/use-edit-profile-modal"

export const useCreateUserTRPC = () => {
  const router = useRouter()
  const utils = trpc.useUtils()

  const { isPending, mutate } = trpc.users.create.useMutation({
    onSuccess: (data) => {
      router.push(createRoute("callback").href)
      toast.success(data.message, {
        description: data.description,
      })
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
    onSettled: () => {
      utils.users.getOne.invalidate()
    },
  })

  return { isPending, mutate }
}

export const useUpdateUserTRPC = ({ onSuccess }: { onSuccess?: () => void }) => {
  const utils = trpc.useUtils()
  const { close } = useEditProfileModal()

  const { isPending, mutate } = trpc.users.update.useMutation({
    onSuccess: async (data) => {
      toast.success(data.message)
      onSuccess?.()

      await Promise.all([new Promise((resolve) => setTimeout(resolve, 300)).then(close)])
    },
    onError: (error) => {
      toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
    },
    onSettled: () => {
      utils.users.getOne.invalidate()
    },
  })

  return { isPending, mutate }
}

export const useUpdateUserImageTRPC = () => {
  const utils = trpc.useUtils()

  const { isPending, mutate } = trpc.users.updateImage.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
    },
    onSettled: () => {
      utils.users.getOne.invalidate()
    },
  })

  return { isPending, mutate }
}
export const useDeleteUserTRPC = () => {
  const utils = trpc.useUtils()
  const router = useRouter()
  const { isPending, mutate } = trpc.users.delete.useMutation({
    onSuccess: (data) => {
      toast.success(data.message, {
        description: data.description,
      })
      // Use Next-Auth signOut to clear cookies and redirect
      signOut({})
      router.push("/sign-in")
    },
    onError: (error) => {
      toast.error(error?.message || GLOBAL_ERROR_MESSAGE)
    },
    onSettled: () => {
      utils.users.getOne.invalidate()
    },
  })

  return { isPending, mutate }
}

export const useInitialEmailChangeTRPC = ({
  setError,
  setSuccess,
}: {
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
}) => {
  const utils = trpc.useUtils()

  const { isPending, mutate } = trpc.users.initialEmailChange.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      setError(null)
      setSuccess(data.message)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      setSuccess(null)
      setError(error.message || GLOBAL_ERROR_MESSAGE)
    },
    onSettled: () => {
      utils.users.getOne.invalidate()
    },
  })

  return { isPending, mutate }
}
