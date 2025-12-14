import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { db } from "@/server/db/config/database"
import { workspaces, workspaceMembers } from "@/server/db/schemas"
import { eq, and } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

export const permissionsRouter = createTRPCRouter({
  /**
   * Get current user's permissions for a workspace
   * Returns role name and list of permission strings
   */
  getMyPermissions: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get workspace by slug
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, input.slug),
      })

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" })
      }

      // Get user's membership with role and permissions
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.userId, ctx.user.id),
          eq(workspaceMembers.workspaceId, workspace.id),
          eq(workspaceMembers.status, "active")
        ),
        with: {
          role: {
            with: {
              permissions: {
                with: {
                  permission: true,
                },
              },
            },
          },
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        })
      }

      // Extract permission names from the role
      const permissionNames = membership.role.permissions.map(
        (rp) => rp.permission.name
      )

      return {
        role: membership.role.name,
        permissions: permissionNames,
      }
    }),
})
