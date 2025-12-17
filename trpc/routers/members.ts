import { hashPassword } from "better-auth/crypto"

import { db } from "@/server/db/config/database"
import { account, roles, workspaceMembers, workspaces } from "@/server/db/schemas"
import { getIsUserMember, hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { slugSchema, userIdSchema, workspaceSchema } from "@/lib/schemas"

// Generate a random password (12 characters, alphanumeric)
function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export const membersRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(workspaceSchema.pick({ slug: true }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx
      const { slug } = input

      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1)

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        })
      }

      const [canManageMembers, members] = await Promise.all([
        hasPermission({
          userId: user.id,
          workspaceId: workspace.id,
          permissionName: PERMISSIONS.MANAGE_MEMBERS,
        }),
        db.query.workspaceMembers.findMany({
          where: eq(workspaceMembers.workspaceId, workspace.id),
          with: {
            user: true,
            role: true,
          },
          orderBy: (workspaceMembers, { asc }) => [asc(workspaceMembers.createdAt)],
        }),
      ])

      const filteredMembers = members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
        role: member.role.name,
        status: member.status,
        workspaceId: workspace.id,
        lastActive: member.user.lastActive,
        ownerId: workspace.ownerId,
      }))

      return {
        user,
        workspace: workspace,
        members: filteredMembers,
        canManageMembers,
      }
    }),

  sessionSwitch: protectedProcedure
    .input(
      z.object({
        slug: slugSchema,
        userId: userIdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { slug, userId } = input

      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1)

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        })
      }

      const isMember = await getIsUserMember({ userId: userId, workspaceId: workspace.id })

      if (!isMember) {
        return {
          redirectUrl: "/callback",
          enableRedirect: true,
        }
      }

      return {
        redirectUrl: `/${slug}/settings/profile`,
        enableRedirect: false,
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        role: z.enum(["member", "event_staff", "manager", "admin", "owner"]),
        userId: userIdSchema,
        slug: slugSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { role, userId, slug } = input

      if (user.id === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't update your own role",
        })
      }

      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1)

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        })
      }

      const [canUpdateRole, [newRole], currentRole, currentUserRole] = await Promise.all([
        hasPermission({
          userId: user.id,
          workspaceId: workspace.id,
          permissionName: PERMISSIONS.MANAGE_MEMBERS,
        }),
        db.select().from(roles).where(eq(roles.name, role)).limit(1),
        db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.workspaceId, workspace.id)
          ),
          with: {
            role: {
              columns: {
                name: true,
              },
            },
          },
        }),
        // Get current user's role to check if they're an owner
        db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, user.id),
            eq(workspaceMembers.workspaceId, workspace.id)
          ),
          with: {
            role: {
              columns: {
                name: true,
              },
            },
          },
        }),
      ])

      if (currentRole?.role.name === newRole?.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't update the role to the same role",
        })
      }

      if (!canUpdateRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this member",
        })
      }

      if (!newRole) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid role",
        })
      }

      // Only owners can promote to owner
      if (role === "owner" && currentUserRole?.role.name !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can promote members to owner",
        })
      }

      // Prevent demotion of primary owner
      if (userId === workspace.ownerId && currentRole?.role.name === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot demote the primary owner. Use ownership transfer instead.",
        })
      }

      // Only owners can demote other owners
      if (currentRole?.role.name === "owner" && currentUserRole?.role.name !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can change the role of another owner",
        })
      }

      // update role in db
      await db
        .update(workspaceMembers)
        .set({ roleId: newRole.id, updatedAt: new Date() })
        .where(
          and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspace.id))
        )

      return {
        message: "Member role updated successfully",
      }
    }),

  resetPassword: protectedProcedure
    .input(
      z.object({
        userId: userIdSchema,
        slug: slugSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { userId, slug } = input

      // Cannot reset own password through this flow
      if (user.id === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reset your own password through this action",
        })
      }

      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1)

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        })
      }

      // Check permission - only owners and admins can reset passwords
      const [canManageMembers, targetMember, currentUserMember] = await Promise.all([
        hasPermission({
          userId: user.id,
          workspaceId: workspace.id,
          permissionName: PERMISSIONS.MANAGE_MEMBERS,
        }),
        db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.workspaceId, workspace.id)
          ),
          with: {
            user: true,
            role: true,
          },
        }),
        db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, user.id),
            eq(workspaceMembers.workspaceId, workspace.id)
          ),
          with: {
            role: true,
          },
        }),
      ])

      if (!canManageMembers) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to reset passwords",
        })
      }

      if (!targetMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        })
      }

      // Cannot reset password of owner unless you are also owner
      if (targetMember.role.name === "owner" && currentUserMember?.role.name !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can reset passwords for other owners",
        })
      }

      // Generate new password
      const generatedPassword = generateRandomPassword()
      const hashedPassword = await hashPassword(generatedPassword)

      // Check if user has a credential account
      const [credentialAccount] = await db
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
        .limit(1)

      if (credentialAccount) {
        // Update existing credential account password
        await db
          .update(account)
          .set({
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(account.id, credentialAccount.id))
      } else {
        // Create new credential account for user (e.g., user only had OAuth)
        await db.insert(account).values({
          id: crypto.randomUUID(),
          userId: userId,
          accountId: userId,
          providerId: "credential",
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      return {
        message: "Password reset successfully",
        email: targetMember.user.email,
        generatedPassword,
      }
    }),

  delete: protectedProcedure
    .input(
      z.object({
        userId: userIdSchema,
        slug: slugSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { userId, slug } = input

      if (user.id === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't delete yourself",
        })
      }

      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1)

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        })
      }

      const [canDelete, member, currentUserRole] = await Promise.all([
        hasPermission({
          userId: user.id,
          workspaceId: workspace.id,
          permissionName: PERMISSIONS.DELETE_MEMBERS,
        }),
        db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.workspaceId, workspace.id)
          ),
          with: {
            role: true,
          },
        }),
        db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.userId, user.id),
            eq(workspaceMembers.workspaceId, workspace.id)
          ),
          with: {
            role: {
              columns: {
                name: true,
              },
            },
          },
        }),
      ])

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this member",
        })
      }

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        })
      }

      if (member.role.name === "admin" && currentUserRole?.role.name !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You do not have permission to delete this member",
        })
      }

      if (
        member.role.name === "owner" ||
        (member.role.name === "admin" && currentUserRole?.role.name !== "owner")
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't delete the owner or admin of the workspace",
        })
      }

      await db
        .delete(workspaceMembers)
        .where(
          and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspace.id))
        )

      return {
        message: "Member deleted successfully",
      }
    }),

  leave: protectedProcedure
    .input(
      z.object({
        slug: slugSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { slug } = input

      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1)

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        })
      }

      await db
        .delete(workspaceMembers)
        .where(
          and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id))
        )

      return {
        message: "Successfully left workspace",
        description: "You will now be redirected...",
      }
    }),
})
