import { db, dbClient } from "@/server/db/config/database"
import { InvitationType, SettingsType, UserType, WorkspaceType } from "@/server/db/schema-types"
import {
  invitations,
  roles,
  users,
  userSettings,
  workspaceMembers,
  workspaces,
} from "@/server/db/schemas"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { eq } from "drizzle-orm"

import { RoleTypesType } from "@/types/types"

type InvitePageResult =
  | { status: "not_found" }
  | { status: "expired"; invitation: InvitationType; workspace: WorkspaceType }
  | { status: "already_accepted"; workspace: WorkspaceType }
  | {
      status: "requires_signin"
      invitation: InvitationType
      workspace: WorkspaceType
    }
  | {
      status: "wrong_user"
      invitation: InvitationType
      workspace: WorkspaceType
      user: Pick<UserType, "id" | "name" | "email" | "image">
    }
  | {
      status: "ready"
      invitation: InvitationType
      workspace: WorkspaceType
      user: Pick<UserType, "id" | "name" | "email" | "image">
      dbUser: UserType
      settings: SettingsType
    }

export async function getInvitePageQuery({ token }: { token: string }): Promise<InvitePageResult> {
  const [invitationData] = await db
    .select({
      invitation: invitations,
      workspace: workspaces,
    })
    .from(invitations)
    .leftJoin(workspaces, eq(invitations.workspaceId, workspaces.id))
    .where(eq(invitations.token, token))
    .limit(1)

  if (!invitationData?.invitation || !invitationData?.workspace) {
    return { status: "not_found" }
  }

  const { invitation, workspace } = invitationData

  // Check if already accepted - redirect to dashboard instead of showing expired
  if (invitation.status === "accepted") {
    return { status: "already_accepted", workspace }
  }

  const [{ user }, [dbUser]] = await Promise.all([
    getCurrentUser(),
    db.select().from(users).where(eq(users.email, invitation.email)),
  ])

  if (user && (user.email !== invitation.email || dbUser.email !== invitation.email)) {
    return { status: "wrong_user", invitation, workspace, user }
  }

  // Check time-based expiration (only for truly expired, not accepted)
  const isTimeExpired = new Date() > new Date(invitation.expiresAt)
  if (invitation.expired || isTimeExpired) {
    return { status: "expired", invitation, workspace }
  }

  if (!user || !dbUser) {
    return { status: "requires_signin", invitation, workspace }
  }

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, dbUser.id))

  return {
    status: "ready",
    invitation,
    workspace,
    user,
    dbUser,
    settings,
  }
}

export function acceptInvitation({
  invitationId,
  userId,
  workspaceId,
  role,
}: {
  invitationId: string
  userId: string
  workspaceId: string
  role: RoleTypesType
}) {
  return dbClient.transaction(async (trx) => {
    const [roleRecord] = await trx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, role))
      .limit(1)

    const member = await trx
      .insert(workspaceMembers)
      .values({
        userId,
        workspaceId,
        roleId: roleRecord.id,
      })
      .returning()

    await trx
      .update(invitations)
      .set({ expired: true, expiresAt: new Date(), updatedAt: new Date(), status: "accepted" })
      .where(eq(invitations.id, invitationId))

    return member
  })
}
