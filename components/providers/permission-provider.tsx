import { notFound, redirect } from "next/navigation"
import { db } from "@/server/db/config/database"
import { WorkspaceType } from "@/server/db/schema-types"
import { workspaces } from "@/server/db/schemas"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { eq } from "drizzle-orm"

import { createRoute } from "@/lib/routes"
import { RestrictedContent } from "@/components/global/restricted-content"

type PermissionProviderProps = {
  slug: WorkspaceType["slug"]
  children: React.ReactNode
}

export async function PermissionProvider({ slug, children }: PermissionProviderProps) {
  const { user } = await getCurrentUser()

  if (!user) {
    return redirect(createRoute("sign-in").href)
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    with: {
      members: {
        columns: {
          userId: true,
          status: true,
        },
      },
    },
  })

  if (!workspace) {
    return notFound()
  }

  if (!workspace.members.some((member) => member.userId === user.id)) {
    return (
      <RestrictedContent
        title="Unauthorized"
        description="You are not authorized to access this workspace."
        ctaText="Return"
      />
    )
  }

  return children
}
