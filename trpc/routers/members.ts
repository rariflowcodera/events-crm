import { db } from "@/server/db/config/database"
import { roles, workspaceMembers, workspaces } from "@/server/db/schemas"
import { getIsUserMember, hasPermission, PERMISSIONS } from "@/server/queries/permissions"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { slugSchema, userIdSchema, workspaceSchema } from "@/lib/schemas"

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
        role: z.enum(["member", "admin"]),
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

      const [canUpdateRole, [newRole], currentRole] = await Promise.all([
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
