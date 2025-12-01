import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"
import type { RsvpFormTemplateCategory } from "@/server/db/schemas/rsvp-form-template"

// Query hooks
export const useRsvpTemplates = (
  workspaceSlug: string,
  options?: {
    category?: RsvpFormTemplateCategory
    includeSystem?: boolean
  }
) => {
  return trpc.rsvpTemplates.getMany.useQuery(
    {
      workspaceSlug,
      category: options?.category,
      includeSystem: options?.includeSystem ?? true,
    },
    { enabled: !!workspaceSlug }
  )
}

export const useRsvpTemplate = (templateId: string) => {
  return trpc.rsvpTemplates.getOne.useQuery({ templateId }, { enabled: !!templateId })
}

// Mutation hooks
export const useCreateRsvpTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.rsvpTemplates.create.useMutation({
    onSuccess: (data, variables) => {
      toast.success("Template created successfully")
      utils.rsvpTemplates.getMany.invalidate({ workspaceSlug: variables.workspaceSlug })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}

export const useUpdateRsvpTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.rsvpTemplates.update.useMutation({
    onSuccess: (data) => {
      toast.success("Template updated successfully")
      utils.rsvpTemplates.getOne.invalidate({ templateId: data.id })
      utils.rsvpTemplates.getMany.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}

export const useDeleteRsvpTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully")
      utils.rsvpTemplates.getMany.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useDuplicateRsvpTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpTemplates.duplicate.useMutation({
    onSuccess: (data, variables) => {
      toast.success("Template duplicated successfully")
      utils.rsvpTemplates.getMany.invalidate({ workspaceSlug: variables.workspaceSlug })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useApplyTemplateToEvent = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpTemplates.applyToEvent.useMutation({
    onSuccess: (data) => {
      toast.success("Template applied to event")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: data.event?.id })
      utils.events.getOne.invalidate({ eventId: data.event?.id })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useSaveFormAsTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpTemplates.saveFromEvent.useMutation({
    onSuccess: (data) => {
      toast.success("Form saved as template")
      utils.rsvpTemplates.getMany.invalidate()
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
