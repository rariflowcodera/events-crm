import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

// Email Templates - Query hooks
export const useEmailTemplates = (params: {
  eventId: string
  type?: string
  categoryId?: string
}) => {
  return trpc.emailTemplates.getMany.useQuery(params as any, { enabled: !!params.eventId })
}

export const useEmailTemplate = (templateId: string) => {
  return trpc.emailTemplates.getOne.useQuery({ templateId }, { enabled: !!templateId })
}

export const useTemplateVariables = (eventId: string) => {
  return trpc.emailTemplates.getVariables.useQuery({ eventId }, { enabled: !!eventId })
}

// Email Templates - Mutation hooks
export const useCreateEmailTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailTemplates.create.useMutation({
    onSuccess: (data) => {
      toast.success("Template created successfully")
      utils.emailTemplates.getMany.invalidate({ eventId: data.eventId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useUpdateEmailTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailTemplates.update.useMutation({
    onSuccess: (data) => {
      toast.success("Template updated successfully")
      utils.emailTemplates.getOne.invalidate({ templateId: data.id })
      utils.emailTemplates.getMany.invalidate({ eventId: data.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useDeleteEmailTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully")
      utils.emailTemplates.getMany.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useDuplicateEmailTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailTemplates.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Template duplicated successfully")
      utils.emailTemplates.getMany.invalidate({ eventId: data.eventId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

// Get default templates for each email type (for settings)
export const useDefaultEmailTemplates = (eventId: string) => {
  return trpc.emailTemplates.getDefaultTemplates.useQuery(
    { eventId },
    { enabled: !!eventId }
  )
}

// Set a template as the default for its type
export const useSetDefaultEmailTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailTemplates.setDefaultTemplate.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Default template updated")
      utils.emailTemplates.getDefaultTemplates.invalidate({ eventId: variables.eventId })
      utils.emailTemplates.getMany.invalidate({ eventId: variables.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

// Email Logs - Query hooks
type EmailStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed"

export const useEmailLogs = (params: {
  eventId: string
  status?: EmailStatus
  guestId?: string
  templateId?: string
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}) => {
  return trpc.emailLogs.getMany.useQuery(params, { enabled: !!params.eventId })
}

export const useEmailLog = (logId: string) => {
  return trpc.emailLogs.getOne.useQuery({ logId }, { enabled: !!logId })
}

export const useEmailStats = (params: { eventId: string; dateFrom?: Date; dateTo?: Date }) => {
  return trpc.emailLogs.getStats.useQuery(params, { enabled: !!params.eventId })
}

export const useGuestEmailLogs = (guestId: string, limit?: number) => {
  return trpc.emailLogs.getByGuest.useQuery({ guestId, limit }, { enabled: !!guestId })
}
