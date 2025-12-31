import { trpc } from "@/trpc/client"
import { toast } from "sonner"

import { GLOBAL_ERROR_MESSAGE } from "@/lib/constants"

// Generate email preview token mutation hook
export const useGenerateEmailPreviewToken = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: {
    token: string
    url: string
    guest: {
      id: string
      firstName: string
      lastName: string | null
      email: string | null
    }
    template: { id: string; name: string }
  }) => void
  onError?: () => void
} = {}) => {
  const { mutate, mutateAsync, isPending, data } =
    trpc.emailPreviewTokens.generateToken.useMutation({
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

// Get email preview token data (for public preview page)
export const useEmailPreviewByToken = (token: string) => {
  return trpc.emailPreviewTokens.getByToken.useQuery(
    { token },
    { enabled: !!token }
  )
}
