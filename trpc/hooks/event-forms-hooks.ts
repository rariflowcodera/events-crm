import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"
import type { CreateEventFormInput, UpdateEventFormInput } from "@/lib/schemas"

// Query hooks
export const useEventForms = (eventId: string) => {
  return trpc.eventForms.getMany.useQuery({ eventId }, { enabled: !!eventId })
}

export const useEventForm = (formId: string) => {
  return trpc.eventForms.getOne.useQuery({ formId }, { enabled: !!formId })
}

export const useEventFormBySlug = (eventId: string, formSlug: string) => {
  return trpc.eventForms.getBySlug.useQuery(
    { eventId, formSlug },
    { enabled: !!eventId && !!formSlug }
  )
}

export const useFormResponses = (
  formId: string,
  options?: { limit?: number; offset?: number }
) => {
  return trpc.eventForms.getResponses.useQuery(
    { formId, ...options },
    { enabled: !!formId }
  )
}

export const useFormResponseSummary = (formId: string) => {
  return trpc.eventForms.getResponseSummary.useQuery({ formId }, { enabled: !!formId })
}

// Mutation hooks
export const useCreateEventForm = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (formId: string) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.eventForms.create.useMutation({
    onSuccess: (data) => {
      toast.success("Form created successfully")
      utils.eventForms.getMany.invalidate({ eventId: data.eventId })
      onSuccess?.(data.id)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}

export const useUpdateEventForm = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.eventForms.update.useMutation({
    onSuccess: (data) => {
      toast.success("Form updated successfully")
      utils.eventForms.getOne.invalidate({ formId: data.id })
      utils.eventForms.getMany.invalidate({ eventId: data.eventId })
      // Also invalidate getBySlug since form detail pages use slug-based queries
      utils.eventForms.getBySlug.invalidate({ eventId: data.eventId, formSlug: data.slug })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}

export const useDeleteEventForm = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.eventForms.delete.useMutation({
    onSuccess: () => {
      toast.success("Form deleted successfully")
      utils.eventForms.getMany.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useDuplicateEventForm = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (formId: string) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.eventForms.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Form duplicated successfully")
      utils.eventForms.getMany.invalidate({ eventId: data.eventId })
      onSuccess?.(data.id)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useCopyFormToEvents = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: {
    copiedCount: number
    results: Array<{
      eventId: string
      eventName: string
      formId: string
      formSlug: string
    }>
  }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.eventForms.copyToEvents.useMutation({
    onSuccess: (data) => {
      // Invalidate forms for all target events
      data.results.forEach((result) => {
        utils.eventForms.getMany.invalidate({ eventId: result.eventId })
      })
      toast.success(
        data.copiedCount === 1
          ? "Form copied successfully"
          : `Form copied to ${data.copiedCount} events`
      )
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}

export const usePublishEventForm = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.eventForms.publish.useMutation({
    onSuccess: (data) => {
      toast.success("Form published successfully")
      utils.eventForms.getOne.invalidate({ formId: data.id })
      utils.eventForms.getMany.invalidate({ eventId: data.eventId })
      utils.eventForms.getBySlug.invalidate({ eventId: data.eventId, formSlug: data.slug })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUnpublishEventForm = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.eventForms.unpublish.useMutation({
    onSuccess: (data) => {
      toast.success("Form unpublished")
      utils.eventForms.getOne.invalidate({ formId: data.id })
      utils.eventForms.getMany.invalidate({ eventId: data.eventId })
      utils.eventForms.getBySlug.invalidate({ eventId: data.eventId, formSlug: data.slug })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useRegenerateShortCode = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.eventForms.regenerateShortCode.useMutation({
    onSuccess: (data) => {
      toast.success("Short code regenerated")
      utils.eventForms.getOne.invalidate({ formId: data.id })
      utils.eventForms.getBySlug.invalidate({ eventId: data.eventId, formSlug: data.slug })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

// Token-based form access hooks
export const useTokenModeForms = (eventId: string) => {
  return trpc.eventForms.getTokenModeForms.useQuery(
    { eventId },
    { enabled: !!eventId }
  )
}

export const useGetGuestFormToken = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: {
    token: string
    expiresAt: Date | null
    guest: { id: string; firstName: string; lastName: string | null; email: string | null }
    form: { id: string; name: { en: string; ar?: string } }
  }) => void
  onError?: () => void
} = {}) => {
  const { mutate, mutateAsync, isPending, data } =
    trpc.eventForms.getGuestFormToken.useMutation({
      onSuccess: (data) => {
        onSuccess?.(data)
      },
      onError: (error) => {
        toast.error(error.message || GLOBAL_ERROR_MESSAGE)
        onError?.()
      },
    })

  return { mutate, mutateAsync, isPending, data }
}
