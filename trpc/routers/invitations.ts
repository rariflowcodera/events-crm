import { BETTER_AUTH_URL_ENV } from "@/env"
import { db, dbClient } from "@/server/db/config/database"
import { invitations, users, workspaceMembers, workspaces } from "@/server/db/schemas"
import { hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { render } from "@react-email/render"
import { TRPCError } from "@trpc/server"
import { isAfter } from "date-fns"
import { and, count, eq, ne } from "drizzle-orm"
import { z } from "zod"

import { RoleTypesType } from "@/types/types"
import { auth } from "@/lib/auth"
import { configuration } from "@/lib/config"
import { email, resolveEmailSender } from "@/lib/email"
import { generateUniqueToken } from "@/lib/invitation"
import { invitationSchema, workspaceSchema } from "@/lib/schemas"
import { InvitationMail } from "@/components/mail/invitation-mail"

// Generate a random password (12 characters, alphanumeric)
function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export const invitationsRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(workspaceSchema.pick({ slug: true }))
    .query(async ({ input }) => {
      const { slug } = input

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
        with: {
          invitations: {
            where: ne(invitations.status, "accepted"),
          },
        },
      })

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      const filteredInvitations = workspace.invitations.map((invitation) => ({
        ...invitation,
        isExpired: isAfter(new Date(), new Date(invitation.expiresAt)),
      }))

      return filteredInvitations
    }),

  create: protectedProcedure.input(invitationSchema).mutation(async ({ ctx, input }) => {
    const { user } = ctx
    const { email: inviteeEmail, role, workspaceId, invitedBy, invitedByProfileImage } = input

    const result = await dbClient.transaction(async (trx) => {
      // Get workspace
      const [workspace] = await trx
        .select({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
          logo: workspaces.logo,
          emailSettings: workspaces.emailSettings,
          members: count(workspaceMembers.userId),
        })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1)
        .leftJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
        .groupBy(workspaces.id)

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      const [canInviteMembers, [invitedUser], [invitation]] = await Promise.all([
        // Get permission
        hasPermission({
          userId: user.id,
          workspaceId: workspaceId,
          permissionName: PERMISSIONS.INVITE_MEMBERS,
        }),

        // Check if the invited user exists in the database
        await trx.select().from(users).where(eq(users.email, inviteeEmail)).limit(1),

        // Get invitation
        await trx
          .select()
          .from(invitations)
          .where(
            and(
              eq(invitations.email, inviteeEmail),
              eq(invitations.workspaceId, workspace.id),
              eq(invitations.expired, false)
            )
          )
          .limit(1),
      ])

      if (!canInviteMembers) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to invite members to this workspace",
        })
      }

      if (invitedUser) {
        // Check if the user is already a member
        const [existingMember] = await trx
          .select()
          .from(workspaceMembers)
          .leftJoin(users, eq(workspaceMembers.userId, users.id))
          .where(
            and(
              eq(workspaceMembers.userId, invitedUser.id),
              eq(workspaceMembers.workspaceId, workspaceId)
            )
          )
          .limit(1)

        if (existingMember && existingMember.user) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${existingMember.user.email} is already a member of this workspace`,
          })
        }
      }

      if (invitation && invitation.status === "accepted") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invitation already exists and was accepted",
        })
      }

      if (invitation && invitation.status === "rejected") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invitation already exists and was rejected",
        })
      }

      if (invitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invitation already exists and is pending",
        })
      }

      // Create the invitation token
      const token = await generateUniqueToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

      if (!token) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error generating token" })
      }

      // Generate password for the new user
      const generatedPassword = generateRandomPassword()

      // Create user account with password if they don't exist
      if (!invitedUser) {
        try {
          await auth.api.signUpEmail({
            body: {
              email: inviteeEmail,
              password: generatedPassword,
              name: inviteeEmail.split("@")[0], // Default name from email
            },
          })
        } catch (signUpError: any) {
          // If user already exists (race condition), continue
          if (!signUpError?.message?.includes("already exists")) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create user account",
            })
          }
        }
      } else {
        // User exists but may not have a password - set one
        // We'll use the auth API to set password for existing users
        // Note: For existing users, we need to use a different approach
        // For now, we'll still generate a password but existing users
        // can continue using magic link
      }

      // Create the invitation
      const invitationUrl = `${BETTER_AUTH_URL_ENV}/invite/${token}?from=invitation`

      await trx
        .insert(invitations)
        .values({
          email: inviteeEmail,
          workspaceId: workspace.id!,
          role: role as RoleTypesType,
          token,
          invitedBy,
          invitedByProfileImage: invitedByProfileImage ?? "",
          expiresAt,
        })
        .returning({ id: invitations.id })

      const html = await render(
        InvitationMail({
          email: inviteeEmail,
          workspaceName: workspace.name,
          logo: workspace.logo,
          invitedBy: user.name,
          invitedByImage: user.image ?? "",
          inviteString: invitationUrl,
        })
      )

      // Resolve email sender with workspace settings fallback
      const fromAddress = resolveEmailSender({
        levelSettings: workspace.emailSettings,
        defaultFrom: configuration.smtp.from,
      })

      await email.send({
        from: fromAddress,
        to: inviteeEmail,
        subject: `Invitation to join the ${workspace.name} workspace | ${configuration.site.name}`,
        html,
      })

      // Return the generated password (only for new users)
      return {
        generatedPassword: !invitedUser ? generatedPassword : null,
        isNewUser: !invitedUser,
      }
    })

    return {
      message: "Invitation sent successfully",
      description: "Please check email for the invitation link",
      generatedPassword: result.generatedPassword,
      isNewUser: result.isNewUser,
    }
  }),

  createBulk: protectedProcedure
    .input(
      z.object({
        emails: z.array(z.string().email()),
        workspaceId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { emails, workspaceId } = input

      await dbClient.transaction(async (trx) => {
        // Get workspace with email settings
        const [workspace] = await trx
          .select({
            id: workspaces.id,
            name: workspaces.name,
            slug: workspaces.slug,
            logo: workspaces.logo,
            emailSettings: workspaces.emailSettings,
          })
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1)

        if (!workspace) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
        }

        const [canInviteMembers, members] = await Promise.all([
          // Get permission
          hasPermission({
            userId: user.id,
            workspaceId: workspaceId,
            permissionName: PERMISSIONS.INVITE_MEMBERS,
          }),

          // Get members
          await trx
            .select()
            .from(workspaceMembers)
            .leftJoin(users, eq(workspaceMembers.userId, users.id))
            .where(eq(workspaceMembers.workspaceId, workspace.id)),
        ])

        if (!canInviteMembers) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to invite members to this workspace",
          })
        }

        // Check if member already exists by email
        const existingMember = emails.some((emailAddr) =>
          members.some((member) => member.user?.email === emailAddr)
        )

        if (existingMember) {
          const existingMemberEmail = emails.find((emailAddr) =>
            members.some((member) => member.user?.email === emailAddr)
          )

          throw new TRPCError({
            code: "CONFLICT",
            message: `User ${existingMemberEmail} is already a member of this workspace`,
          })
        }

        for (const emailAddr of emails) {
          // Check if the invited user exists in the database
          const [invitedUserExist] = await trx
            .select()
            .from(users)
            .where(eq(users.email, emailAddr))
            .limit(1)

          if (invitedUserExist) {
            // Check if the user is already a member
            const [existingMember] = await trx
              .select()
              .from(workspaceMembers)
              .leftJoin(users, eq(workspaceMembers.userId, users.id))
              .where(
                and(
                  eq(workspaceMembers.userId, invitedUserExist.id),
                  eq(workspaceMembers.workspaceId, workspace.id)
                )
              )
              .limit(1)

            if (existingMember && existingMember.user) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `${existingMember.user.email} is already a member of this workspace`,
              })
            }
          }

          // Check if the invitation exists
          const [invitation] = await trx
            .select()
            .from(invitations)
            .where(
              and(
                eq(invitations.email, emailAddr),
                eq(invitations.workspaceId, workspace.id),
                eq(invitations.expired, false)
              )
            )
            .limit(1)

          if (invitation) {
            throw new TRPCError({ code: "CONFLICT", message: "Invitation already exists" })
          }

          // Create the invitation token
          const token = await generateUniqueToken()
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

          if (!token) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Error generating token",
            })
          }

          // Create the invitation
          const invitationUrl = `${process.env.NEXTAUTH_URL}/invite/${token}?from=invitation`

          await trx
            .insert(invitations)
            .values({
              email: emailAddr,
              workspaceId: workspace.id!,
              role: "member",
              token,
              invitedBy: user.email,
              invitedByProfileImage: user.image ?? "",
              expiresAt,
            })
            .returning({ id: invitations.id })

          const html = await render(
            InvitationMail({
              email: emailAddr,
              workspaceName: workspace.name,
              logo: workspace.logo,
              invitedBy: user.name,
              invitedByImage: user.image ?? "",
              inviteString: invitationUrl,
            })
          )

          // Resolve email sender with workspace settings fallback
          const fromAddress = resolveEmailSender({
            levelSettings: workspace.emailSettings,
            defaultFrom: configuration.smtp.from,
          })

          await email.send({
            from: fromAddress,
            to: emailAddr,
            subject: `Invitation to join the ${workspace.name} workspace | ${configuration.site.name}`,
            html,
          })
        }
      })

      return {
        message: "Invitations created successfully",
      }
    }),

  revoke: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        workspaceId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { email: inviteeEmail, workspaceId } = input

      await dbClient.transaction(async (trx) => {
        // Get workspace
        const [workspace] = await trx
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1)

        if (!workspace) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
        }

        const [[invitation], canRevokeInvitations] = await Promise.all([
          // Get invitation object
          await trx
            .select()
            .from(invitations)
            .where(and(eq(invitations.workspaceId, workspaceId), eq(invitations.email, inviteeEmail)))
            .limit(1),

          // Get permission
          hasPermission({
            userId: user.id,
            workspaceId: workspace.id,
            permissionName: PERMISSIONS.DELETE_MEMBERS,
          }),
        ])

        if (!invitation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" })
        }

        if (!canRevokeInvitations) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete invitations",
          })
        }

        // Delete the invitation object
        await trx.delete(invitations).where(eq(invitations.id, invitation.id))
      })

      return {
        message: "Invitation revoked successfully",
      }
    }),

  decline: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input

      // Get invitation object
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, id))
        .limit(1)

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" })
      }

      await db
        .update(invitations)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(invitations.id, id))

      return {
        message: "Invitation deleted successfully",
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input

      // Get invitation object
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, id))
        .limit(1)

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" })
      }

      await db.delete(invitations).where(eq(invitations.id, id))

      return {
        message: "Invitation deleted successfully",
      }
    }),
})
