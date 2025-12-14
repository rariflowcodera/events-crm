import { trpc } from "@/trpc/client"

// Query hooks
export const usePublicForm = (shortCode: string) => {
  return trpc.publicForms.getByShortCode.useQuery(
    { shortCode },
    { enabled: !!shortCode }
  )
}

// Mutation hooks
export const useLookupGuest = () => {
  const { mutate, mutateAsync, isPending, data, reset } =
    trpc.publicForms.lookupGuest.useMutation()

  return { mutate, mutateAsync, isPending, data, reset }
}

export const useSubmitFormResponse = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (responseId: string) => void
  onError?: (message: string) => void
} = {}) => {
  const { mutate, mutateAsync, isPending } =
    trpc.publicForms.submitResponse.useMutation({
      onSuccess: (data) => {
        onSuccess?.(data.responseId)
      },
      onError: (error) => {
        onError?.(error.message)
      },
    })

  return { mutate, mutateAsync, isPending }
}
