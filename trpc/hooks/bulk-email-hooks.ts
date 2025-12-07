import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"
import type { EmailTemplateType } from "@/lib/schemas"

/**
 * Send bulk emails to selected guests
 */
export const useSendBulkEmail = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { bulkJobId: string; totalEmails: number; skippedCount: number }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.bulkEmail.sendBulk.useMutation({
    onSuccess: (data, variables) => {
      if (data.skippedCount > 0) {
        toast.success(
          `Sending ${data.totalEmails} emails (${data.skippedCount} guests skipped - no email)`
        )
      } else {
        toast.success(`Sending ${data.totalEmails} emails`)
      }
      utils.bulkEmail.listJobs.invalidate({ eventId: variables.eventId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

/**
 * Send bulk emails using category-assigned templates
 */
export const useSendBulkByCategory = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: {
    jobs: { bulkJobId: string; templateId: string; guestCount: number }[]
    totalEmails: number
    skippedCount: number
  }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.bulkEmail.sendBulkByCategory.useMutation({
    onSuccess: (data, variables) => {
      if (data.skippedCount > 0) {
        toast.success(
          `Sending ${data.totalEmails} emails (${data.skippedCount} guests skipped - no email)`
        )
      } else {
        toast.success(`Sending ${data.totalEmails} emails`)
      }
      utils.bulkEmail.listJobs.invalidate({ eventId: variables.eventId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

/**
 * Send to all guests using default template
 */
export const useSendToAllGuests = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { bulkJobId: string; totalEmails: number }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.bulkEmail.sendToAll.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Sending ${data.totalEmails} emails`)
      utils.bulkEmail.listJobs.invalidate({ eventId: variables.eventId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

/**
 * Get bulk email job status (with optional polling)
 */
export const useBulkEmailJobStatus = (
  jobId: string | null,
  options?: { refetchInterval?: number | false }
) => {
  return trpc.bulkEmail.getJobStatus.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId,
      refetchInterval: options?.refetchInterval ?? false,
    }
  )
}

/**
 * List recent bulk email jobs for an event
 */
export const useBulkEmailJobs = (eventId: string, limit?: number) => {
  return trpc.bulkEmail.listJobs.useQuery(
    { eventId, limit: limit ?? 10 },
    { enabled: !!eventId }
  )
}

/**
 * Cancel a bulk email job
 */
export const useCancelBulkEmailJob = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.bulkEmail.cancelJob.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Email job cancelled")
      utils.bulkEmail.getJobStatus.invalidate({ jobId: variables.jobId })
      utils.bulkEmail.listJobs.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
