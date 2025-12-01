import { Suspense } from "react"
import { Metadata } from "next"

import { ROUTES } from "@/lib/routes"
import { ErrorClient } from "@/components/global/error-client"

export const metadata: Metadata = ROUTES.error.metadata

export default function ErrorPage() {
  return (
    <main>
      <Suspense>
        <ErrorClient />
      </Suspense>
    </main>
  )
}
