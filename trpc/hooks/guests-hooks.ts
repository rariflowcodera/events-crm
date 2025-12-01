import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

// Query hooks
export const useGuests = (params: {
  eventId: string
  status?: string
  categoryId?: string
  search?: string
  limit?: number
  offset?: number
}) => {
  return trpc.guests.getMany.useQuery(params as any, { enabled: !!params.eventId })
}

export const useGuest = (guestId: string) => {
  return trpc.guests.getOne.useQuery({ guestId }, { enabled: !!guestId })
}

export const useGuestStats = (eventId: string) => {
  return trpc.guests.getStats.useQuery({ eventId }, { enabled: !!eventId })
}

// Mutation hooks
export const useCreateGuest = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.create.useMutation({
    onSuccess: (data) => {
      toast.success("Guest added successfully")
      utils.guests.getMany.invalidate({ eventId: data.eventId })
      utils.guests.getStats.invalidate({ eventId: data.eventId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUpdateGuest = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.update.useMutation({
    onSuccess: (data) => {
      toast.success("Guest updated successfully")
      utils.guests.getOne.invalidate({ guestId: data.id })
      utils.guests.getMany.invalidate({ eventId: data.eventId })
      utils.guests.getStats.invalidate({ eventId: data.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useDeleteGuest = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.delete.useMutation({
    onSuccess: () => {
      toast.success("Guest deleted successfully")
      utils.guests.getMany.invalidate()
      utils.guests.getStats.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useBulkDeleteGuests = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { deletedCount: number }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} guest(s) deleted successfully`)
      utils.guests.getMany.invalidate()
      utils.guests.getStats.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useBulkUpdateGuestStatus = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { updatedCount: number }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updatedCount} guest(s) updated successfully`)
      utils.guests.getMany.invalidate()
      utils.guests.getStats.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useBulkUpdateGuestCategory = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { updatedCount: number }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.bulkUpdateCategory.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updatedCount} guest(s) updated successfully`)
      utils.guests.getMany.invalidate()
      utils.guests.getStats.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useRegenerateRsvpToken = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { rsvpToken: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.regenerateRsvpToken.useMutation({
    onSuccess: (data) => {
      toast.success("RSVP token regenerated successfully")
      utils.guests.getOne.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useBulkCreateGuests = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { createdCount: number; importBatchId: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guests.bulkCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.createdCount} guest(s) imported successfully`)
      utils.guests.getMany.invalidate()
      utils.guests.getStats.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
