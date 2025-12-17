import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

// Query hooks
export const useEvents = (workspaceSlug: string) => {
  return trpc.events.getMany.useQuery({ workspaceSlug })
}

export const useEvent = (eventId: string) => {
  return trpc.events.getOne.useQuery({ eventId }, { enabled: !!eventId })
}

export const useEventBySlug = (workspaceSlug: string, eventSlug: string) => {
  return trpc.events.getBySlug.useQuery(
    { workspaceSlug, eventSlug },
    { enabled: !!workspaceSlug && !!eventSlug }
  )
}

// Mutation hooks
export const useCreateEvent = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string; slug: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.events.create.useMutation({
    onSuccess: (data) => {
      toast.success("Event created successfully")
      utils.events.getMany.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUpdateEvent = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.events.update.useMutation({
    onSuccess: (data) => {
      toast.success("Event updated successfully")
      utils.events.getOne.invalidate({ eventId: data.id })
      utils.events.getMany.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useDeleteEvent = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Event deleted successfully")
      utils.events.getMany.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

// ============================================================================
// Event Branding Hooks
// ============================================================================

export const useEventBranding = (eventId: string) => {
  return trpc.events.getBranding.useQuery({ eventId }, { enabled: !!eventId })
}

export const useUpdateEventBranding = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.events.updateBranding.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.events.getBranding.invalidate()
      utils.events.getOne.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

// ============================================================================
// Custom Domain Hooks
// ============================================================================

export const useUpdateEventCustomDomain = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { customDomain: string | null; verificationToken: string; message: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.events.updateCustomDomain.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.events.getOne.invalidate()
      utils.events.getBySlug.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useVerifyEventCustomDomain = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.events.verifyCustomDomain.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.events.getOne.invalidate()
      utils.events.getBySlug.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useRemoveEventCustomDomain = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.events.removeCustomDomain.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
      utils.events.getOne.invalidate()
      utils.events.getBySlug.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

// ============================================================================
// Event Duplication Hooks
// ============================================================================

export type DuplicateEventResult = {
  event: {
    id: string
    slug: string
    name: string
  }
  stats: {
    categoriesCopied: number
    emailTemplatesCopied: number
    guestListViewsCopied: number
    eventFormsCopied: number
    documentsCopied: number
    itineraryTemplatesCopied: number
    itineraryItemsCopied: number
    inventoryTypesCopied: number
    workflowsCopied: number
    workflowStepsCopied: number
    masterTemplatesCopied: number
  }
}

export const useDuplicateEvent = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: DuplicateEventResult) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.events.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Event duplicated successfully")
      utils.events.getMany.invalidate()
      onSuccess?.(data as DuplicateEventResult)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}
