import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

// ============================================================================
// Query Hooks
// ============================================================================

export const useGuestListViews = (eventId: string) => {
  return trpc.guestListViews.getMany.useQuery(
    { eventId },
    { enabled: !!eventId }
  )
}

export const usePinnedGuestListViews = (eventId: string) => {
  return trpc.guestListViews.getPinned.useQuery(
    { eventId },
    { enabled: !!eventId }
  )
}

export const useGuestListView = (viewId: string) => {
  return trpc.guestListViews.getOne.useQuery(
    { viewId },
    { enabled: !!viewId }
  )
}

export const useDefaultGuestListView = (eventId: string) => {
  return trpc.guestListViews.getDefaultView.useQuery(
    { eventId },
    { enabled: !!eventId }
  )
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useCreateGuestListView = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string; eventId: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestListViews.create.useMutation({
    onSuccess: (data) => {
      toast.success("View created successfully")
      utils.guestListViews.getMany.invalidate({ eventId: data.eventId })
      utils.guestListViews.getPinned.invalidate({ eventId: data.eventId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUpdateGuestListView = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestListViews.update.useMutation({
    onSuccess: (data) => {
      toast.success("View updated successfully")
      utils.guestListViews.getOne.invalidate({ viewId: data.id })
      utils.guestListViews.getMany.invalidate({ eventId: data.eventId })
      utils.guestListViews.getPinned.invalidate({ eventId: data.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useDeleteGuestListView = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestListViews.delete.useMutation({
    onSuccess: () => {
      toast.success("View deleted successfully")
      utils.guestListViews.getMany.invalidate()
      utils.guestListViews.getPinned.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useReorderPinnedViews = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestListViews.reorderPinned.useMutation({
    onSuccess: () => {
      utils.guestListViews.getPinned.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useGetOrCreateAllGuestsView = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string; eventId: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } =
    trpc.guestListViews.getOrCreateAllGuestsView.useMutation({
      onSuccess: (data) => {
        utils.guestListViews.getMany.invalidate({ eventId: data.eventId })
        utils.guestListViews.getPinned.invalidate({ eventId: data.eventId })
        utils.guestListViews.getDefaultView.invalidate({ eventId: data.eventId })
        onSuccess?.(data)
      },
      onError: (error) => {
        toast.error(error.message || GLOBAL_ERROR_MESSAGE)
        onError?.()
      },
    })

  return { mutate, mutateAsync, isPending }
}

export const useSetDefaultGuestListView = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestListViews.setDefault.useMutation({
    onSuccess: (data) => {
      toast.success("Default view updated")
      utils.guestListViews.getOne.invalidate({ viewId: data.id })
      utils.guestListViews.getMany.invalidate({ eventId: data.eventId })
      utils.guestListViews.getPinned.invalidate({ eventId: data.eventId })
      utils.guestListViews.getDefaultView.invalidate({ eventId: data.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
