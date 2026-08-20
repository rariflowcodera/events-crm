import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"
import type { EventDocumentType } from "@/server/db/schemas/event-document"

// Query hooks
export const useEventDocuments = (eventId: string, type?: EventDocumentType) => {
  return trpc.eventDocuments.getMany.useQuery(
    { eventId, type },
    { enabled: !!eventId }
  )
}

export const useEventDocument = (documentId: string) => {
  return trpc.eventDocuments.getOne.useQuery(
    { documentId },
    { enabled: !!documentId }
  )
}

// Mutation hooks
export const useCreateEventDocument = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string; eventId: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.eventDocuments.create.useMutation({
    onSuccess: (data) => {
      toast.success("Document uploaded successfully")
      utils.eventDocuments.getMany.invalidate({ eventId: data.eventId })
      utils.emailTemplates.getVariables.invalidate({ eventId: data.eventId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}

export const useUpdateEventDocument = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.eventDocuments.update.useMutation({
    onSuccess: (data) => {
      toast.success("Document updated")
      utils.eventDocuments.getMany.invalidate({ eventId: data.eventId })
      utils.eventDocuments.getOne.invalidate({ documentId: data.id })
      utils.emailTemplates.getVariables.invalidate({ eventId: data.eventId })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

export const useReplaceEventDocumentFile = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, mutateAsync, isPending } = trpc.eventDocuments.replaceFile.useMutation({
    onSuccess: (data) => {
      toast.success("Document file replaced")
      utils.eventDocuments.getMany.invalidate({ eventId: data.eventId })
      utils.eventDocuments.getOne.invalidate({ documentId: data.id })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, mutateAsync, isPending }
}

export const useDeleteEventDocument = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.eventDocuments.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted")
      utils.eventDocuments.getMany.invalidate()
      utils.emailTemplates.getVariables.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
