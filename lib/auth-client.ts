import { BETTER_AUTH_URL_ENV } from "@/env"
import { magicLinkClient, multiSessionClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { toast } from "sonner"

export const authClient = createAuthClient({
  baseURL: BETTER_AUTH_URL_ENV,
  plugins: [magicLinkClient(), multiSessionClient()],
  fetchOptions: {
    onError: async (context) => {
      const { response } = context
      if (response.status === 429) {
        const retryAfter = response.headers.get("X-Retry-After")
        toast.error(`Rate limit exceeded. Retry after ${retryAfter} seconds`)
      }
    },
  },
})

export const { getSession, signIn, signOut, useSession } = authClient
