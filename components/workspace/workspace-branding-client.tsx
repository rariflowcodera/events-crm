"use client"

import { Suspense } from "react"
import { notFound } from "next/navigation"
import { WorkspaceType } from "@/server/db/schema-types"
import { trpc } from "@/trpc/client"
import { ErrorBoundary } from "react-error-boundary"

import { redirectToRoute } from "@/lib/routes"
import { Alert } from "@/components/global/alert"
import {
  WorkspaceBrandingForm,
  WorkspaceBrandingFormSkeleton,
} from "@/components/workspace/workspace-branding-form"

type WorkspaceBrandingClientProps = {
  slug: WorkspaceType["slug"]
}

export function WorkspaceBrandingClient({ slug }: WorkspaceBrandingClientProps) {
  return (
    <Suspense fallback={<WorkspaceBrandingFormSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert
            variant="error"
            title={error.message || "An error occurred"}
            icon="alertTriangle"
          />
        )}
      >
        <WorkspaceBrandingClientSuspense slug={slug} />
      </ErrorBoundary>
    </Suspense>
  )
}

function WorkspaceBrandingClientSuspense({ slug }: WorkspaceBrandingClientProps) {
  const [workspaceData] = trpc.workspaces.getOne.useSuspenseQuery({ slug })
  const [brandingData] = trpc.workspaces.getBranding.useSuspenseQuery({ slug })

  const { canEdit, user, workspace } = workspaceData

  if (!user) {
    return redirectToRoute("sign-in")
  }

  if (!workspace) {
    return notFound()
  }

  return (
    <WorkspaceBrandingForm
      workspaceId={brandingData.workspaceId}
      branding={brandingData.branding}
      canEdit={canEdit}
    />
  )
}
