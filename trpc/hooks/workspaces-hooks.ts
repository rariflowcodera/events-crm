import { useRouter } from "next/navigation"
import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"
import { createRoute } from "@/lib/routes"

export const useCreateWorkspaceTRPC = () => {
  const router = useRouter()
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.workspaces.create.useMutation({
    onSuccess: (res) => {
      toast.success("Workspace created successfully", {
        description: res.description,
      })
      router.push(res.redirectUrl)
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      utils.workspaces.getSwitcher.invalidate()
    },
  })

  return { isPending, mutate }
}

export const useUpdateWorkspaceTRPC = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
}) => {
  const router = useRouter()
  const utils = trpc.useUtils()

  const { isPending, mutate } = trpc.workspaces.update.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      if (data.newSlug) {
        utils.workspaces.invalidate()
        router.push(createRoute("settings-workspace", { slug: data.newSlug }).href)
      }
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
    onSettled: () => {
      utils.workspaces.getSwitcher.invalidate()
      utils.workspaces.getOne.invalidate()
    },
  })

  return { mutate, isPending }
}

export const useDeleteWorkspaceTRPC = ({ enableRedirect = true }: { enableRedirect?: boolean }) => {
  const router = useRouter()
  const utils = trpc.useUtils()

  const { isPending, mutate } = trpc.workspaces.delete.useMutation({
    onSuccess: (data) => {
      const { message, description, redirectUrl } = data
      toast.success(message, {
        description: enableRedirect ? description : null,
      })
      if (enableRedirect && redirectUrl) {
        router.push(redirectUrl)
      }
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
    onSettled: () => {
      utils.workspaces.getSwitcher.invalidate()
      utils.workspaces.getOne.invalidate()
      utils.members.getMany.invalidate()
    },
  })

  return { isPending, mutate }
}

export const useTransferOwnershipTRPC = () => {
  const utils = trpc.useUtils()

  const { isPending, mutate } = trpc.workspaces.transferOwnership.useMutation({
    onSuccess: (data) => {
      toast.success(data.message, {
        description: data.description,
      })
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
    onSettled: () => {
      utils.workspaces.getSwitcher.invalidate()
    },
  })

  return { isPending, mutate }
}

export const useUpdateWorkspaceLogoTRPC = () => {
  const utils = trpc.useUtils()

  const { isPending, mutate } = trpc.workspaces.updateLogo.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
    },
    onSettled: () => {
      utils.workspaces.getSwitcher.invalidate()
    },
  })

  return { isPending, mutate }
}

// ============================================================================
// Workspace Branding Hooks
// ============================================================================

export const useWorkspaceBranding = (slug: string) => {
  return trpc.workspaces.getBranding.useQuery({ slug }, { enabled: !!slug })
}

export const useUpdateWorkspaceBranding = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.workspaces.updateBranding.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.workspaces.getBranding.invalidate()
      utils.workspaces.getOne.invalidate()
      utils.workspaces.getSwitcher.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
