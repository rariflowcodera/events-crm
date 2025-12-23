import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get master templates for a workspace, optionally filtered by event.
 */
export const useMasterTemplates = (params: {
  workspaceId: string
  eventId?: string
  includeWorkspaceLevel?: boolean
}) => {
  return trpc.emailMasterTemplates.getMany.useQuery(params, {
    enabled: !!params.workspaceId,
  })
}

/**
 * Get a single master template by ID.
 */
export const useMasterTemplate = (templateId: string) => {
  return trpc.emailMasterTemplates.getOne.useQuery(
    { templateId },
    { enabled: !!templateId }
  )
}

/**
 * Get the resolved/effective master template for an event.
 * Returns event-level default if exists, otherwise workspace-level default,
 * or the built-in default if no custom templates.
 */
export const useResolvedMasterTemplate = (eventId: string) => {
  return trpc.emailMasterTemplates.getResolved.useQuery(
    { eventId },
    { enabled: !!eventId }
  )
}

/**
 * Preview a master template with sample data.
 */
export const useMasterTemplatePreview = (params: {
  templateId?: string
  htmlTemplate?: string
  structure?: {
    showLogo: boolean
    showAccentStrip: boolean
    showEnglishSection: boolean
    showArabicSection: boolean
    showDivider: boolean
    showFooter: boolean
    showBannerFooter: boolean
    sectionOrder: ("en" | "ar")[]
  }
  workspaceId: string
  eventId?: string
}) => {
  return trpc.emailMasterTemplates.preview.useQuery(params, {
    enabled: !!params.workspaceId && (!!params.templateId || !!params.htmlTemplate),
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new master template.
 */
export const useCreateMasterTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailMasterTemplates.create.useMutation({
    onSuccess: (data) => {
      toast.success("Master template created successfully")
      utils.emailMasterTemplates.getMany.invalidate({ workspaceId: data.workspaceId })
      if (data.eventId) {
        utils.emailMasterTemplates.getResolved.invalidate({ eventId: data.eventId })
      }
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
 * Update an existing master template.
 */
export const useUpdateMasterTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailMasterTemplates.update.useMutation({
    onSuccess: (data) => {
      toast.success("Master template updated successfully")
      utils.emailMasterTemplates.getOne.invalidate({ templateId: data.id })
      utils.emailMasterTemplates.getMany.invalidate({ workspaceId: data.workspaceId })
      if (data.eventId) {
        utils.emailMasterTemplates.getResolved.invalidate({ eventId: data.eventId })
      }
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

/**
 * Delete a master template.
 */
export const useDeleteMasterTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailMasterTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Master template deleted successfully")
      utils.emailMasterTemplates.getMany.invalidate()
      utils.emailMasterTemplates.getResolved.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

/**
 * Set a master template as the default.
 */
export const useSetDefaultMasterTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailMasterTemplates.setDefault.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Default template updated")
      utils.emailMasterTemplates.getMany.invalidate({ workspaceId: variables.workspaceId })
      if (variables.eventId) {
        utils.emailMasterTemplates.getResolved.invalidate({ eventId: variables.eventId })
      }
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}

/**
 * Duplicate a master template.
 */
export const useDuplicateMasterTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { id: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailMasterTemplates.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Master template duplicated successfully")
      utils.emailMasterTemplates.getMany.invalidate({ workspaceId: data.workspaceId })
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
 * Seed the default master template for a workspace.
 */
export const useSeedDefaultMasterTemplate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: { created: boolean; templateId: string }) => void
  onError?: () => void
} = {}) => {
  const utils = trpc.useUtils()

  const { mutate, isPending } = trpc.emailMasterTemplates.seedDefault.useMutation({
    onSuccess: (data, variables) => {
      if (data.created) {
        toast.success("Default master template created")
      }
      utils.emailMasterTemplates.getMany.invalidate({ workspaceId: variables.workspaceId })
      onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })

  return { mutate, isPending }
}
