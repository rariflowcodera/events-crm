import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"
import type { RsvpFormConfig, RsvpFormSectionId } from "@/server/db/schemas/event"

// Query hooks
export const useRsvpFormConfig = (eventId: string) => {
  return trpc.rsvpForms.getFormConfig.useQuery({ eventId }, { enabled: !!eventId })
}

export const useStandardFields = () => {
  return trpc.rsvpForms.getStandardFields.useQuery()
}

// Mutation hooks
export const useUpdateFormConfig = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.rsvpForms.updateFormConfig.useMutation({
    onSuccess: (data) => {
      toast.success("Form configuration saved")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: data.event?.id })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}

export const useToggleSection = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.toggleSection.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`Section ${variables.enabled ? "enabled" : "disabled"}`)
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useToggleStandardField = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.toggleStandardField.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`Field ${variables.enabled ? "enabled" : "disabled"}`)
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUpdateStandardField = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.updateStandardField.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Field updated")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useAddCustomField = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (fieldId: string) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.addCustomField.useMutation({
    onSuccess: (data, variables) => {
      toast.success("Custom field added")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.(data.fieldId)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUpdateCustomField = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.updateCustomField.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Custom field updated")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useDeleteCustomField = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.deleteCustomField.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Custom field deleted")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useReorderSections = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.reorderSections.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Sections reordered")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useReorderCustomFields = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.reorderCustomFields.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Fields reordered")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUpdateFormSettings = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.updateSettings.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Settings updated")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useInitializeDefaultForm = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.rsvpForms.initializeDefault.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Form initialized")
      utils.rsvpForms.getFormConfig.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
