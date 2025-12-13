import { db } from "@/server/db/config/database"
import { invitations, workspaces } from "@/server/db/schemas"
import { and, asc, eq } from "drizzle-orm"

export async function getCallbackPageQuery(userId: string) {
  // Get both owned and member workspaces in parallel
  const [ownedWorkspaces, memberWorkspaces] = await Promise.all([
    // Get owned workspaces
    db
      .select()
      .from(workspaces)
      .orderBy(asc(workspaces.createdAt))
      .where(eq(workspaces.ownerId, userId)),

    // Get member workspaces
    db.query.workspaceMembers.findMany({
      where: (members, { and, eq, not, exists }) =>
        and(
          eq(members.userId, userId),
          not(
            exists(
              db
                .select()
                .from(workspaces)
                .where(
                  and(eq(workspaces.id, members.workspaceId), eq(workspaces.ownerId, userId))
                )
            )
          )
        ),

      with: {
        workspace: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: asc(workspaces.createdAt),
    }),
  ])

  const otherWorkspaces = memberWorkspaces.map((member) => member.workspace)

  return {
    ownedWorkspaces,
    memberWorkspaces: otherWorkspaces,
  }
}

export async function getPendingInvitationsForUser(email: string) {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      workspaceId: invitations.workspaceId,
      role: invitations.role,
      token: invitations.token,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
        eq(invitations.expired, false)
      )
    )
}
