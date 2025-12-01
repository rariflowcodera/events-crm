import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

// Query hooks
export const useGuestCategories = (eventId: string) => {
  return trpc.guestCategories.getMany.useQuery({ eventId }, { enabled: !!eventId })
}

export const useGuestCategory = (categoryId: string) => {
  return trpc.guestCategories.getOne.useQuery({ categoryId }, { enabled: !!categoryId })
}

// Mutation hooks
export const useCreateGuestCategory = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestCategories.create.useMutation({
    onSuccess: (data) => {
      toast.success("Category created successfully")
      utils.guestCategories.getMany.invalidate({ eventId: data.eventId })
      utils.events.getOne.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUpdateGuestCategory = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestCategories.update.useMutation({
    onSuccess: (data) => {
      toast.success("Category updated successfully")
      utils.guestCategories.getOne.invalidate({ categoryId: data.id })
      utils.guestCategories.getMany.invalidate({ eventId: data.eventId })
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

export const useDeleteGuestCategory = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestCategories.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted successfully")
      utils.guestCategories.getMany.invalidate()
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

export const useReorderGuestCategories = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.guestCategories.reorder.useMutation({
    onSuccess: () => {
      toast.success("Categories reordered successfully")
      utils.guestCategories.getMany.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
