import { trpc } from "@/trpc/client"

/**
 * Get email delivery stats for an event
 */
export function useEmailDeliveryStats(eventId: string) {
  return trpc.emailDelivery.getStats.useQuery(
    { eventId },
    {
      enabled: !!eventId,
    }
  )
}

/**
 * Get recent bounced emails for an event
 */
export function useRecentBounces(eventId: string, limit = 10) {
  return trpc.emailDelivery.getRecentBounces.useQuery(
    { eventId, limit },
    {
      enabled: !!eventId,
    }
  )
}

/**
 * Get suppression list statistics
 */
export function useSuppressionStats() {
  return trpc.emailDelivery.getSuppressionStats.useQuery()
}

/**
 * List suppressed emails with pagination and search
 */
export function useSuppressionList(
  options: {
    search?: string
    limit?: number
    offset?: number
  } = {}
) {
  return trpc.emailDelivery.listSuppressions.useQuery({
    search: options.search,
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
  })
}

/**
 * Trigger a manual suppression sync
 */
export function useTriggerSuppressionSync() {
  const utils = trpc.useUtils()

  return trpc.emailDelivery.triggerSync.useMutation({
    onSuccess: () => {
      // Invalidate suppression stats after triggering sync
      utils.emailDelivery.getSuppressionStats.invalidate()
      utils.emailDelivery.listSuppressions.invalidate()
    },
  })
}

/**
 * Remove an email from the suppression list
 */
export function useRemoveFromSuppression() {
  const utils = trpc.useUtils()

  return trpc.emailDelivery.removeFromSuppression.useMutation({
    onSuccess: () => {
      utils.emailDelivery.getSuppressionStats.invalidate()
      utils.emailDelivery.listSuppressions.invalidate()
    },
  })
}

/**
 * Manually add an email to the suppression list
 */
export function useAddToSuppression() {
  const utils = trpc.useUtils()

  return trpc.emailDelivery.addToSuppression.useMutation({
    onSuccess: () => {
      utils.emailDelivery.getSuppressionStats.invalidate()
      utils.emailDelivery.listSuppressions.invalidate()
    },
  })
}
