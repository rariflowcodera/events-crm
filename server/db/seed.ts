/* eslint-disable no-console */
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local before any other imports
config({ path: resolve(process.cwd(), ".env.local") })

import { db } from "@/server/db/config/database"
import { roles, users, workspaceMembers, workspaces } from "@/server/db/schemas"
import { initializeRBAC } from "@/server/queries/permissions"
import { eq } from "drizzle-orm"

async function seedAdminAndWorkspace() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL

  if (!adminEmail) {
    console.log("⏭️  SEED_ADMIN_EMAIL not set, skipping admin user and workspace creation")
    return
  }

  console.log(`👤 Creating admin user with email: ${adminEmail}`)

  // Check if user already exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, adminEmail))

  let userId: string

  if (existingUser) {
    console.log("   User already exists, using existing user")
    userId = existingUser.id
  } else {
    // Create user - Better-Auth will handle the actual authentication
    // We just need a user record for the workspace owner
    const [newUser] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        name: "Admin",
        email: adminEmail,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    userId = newUser.id
    console.log("   Created new user")
  }

  // Check if demo workspace already exists
  const [existingWorkspace] = await db.select().from(workspaces).where(eq(workspaces.slug, "demo"))

  if (existingWorkspace) {
    console.log("🏢 Demo workspace already exists, skipping workspace creation")
    return
  }

  console.log("🏢 Creating Demo Workspace...")

  // Create the workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      id: crypto.randomUUID(),
      name: "Demo Workspace",
      slug: "demo",
      ownerId: userId,
      createdAt: new Date(),
    })
    .returning()

  // Get the owner role
  const [ownerRole] = await db.select().from(roles).where(eq(roles.name, "owner"))

  if (!ownerRole) {
    throw new Error("Owner role not found. Make sure RBAC is initialized first.")
  }

  // Add user as workspace owner member
  await db.insert(workspaceMembers).values({
    userId: userId,
    workspaceId: workspace.id,
    roleId: ownerRole.id,
    status: "active",
    createdAt: new Date(),
  })

  console.log("   Created workspace and added user as owner")
}

async function seed() {
  try {
    console.log("🌱 Starting database seed...")
    console.log("📊 Initializing RBAC...")
    await initializeRBAC()
    console.log("")
    await seedAdminAndWorkspace()
    console.log("")
    console.log("✅ Seed completed successfully")
  } catch (error) {
    console.error("❌ Seed failed:", error)
    throw error
  }
}

// Immediately execute when file is run
seed().catch((err) => {
  console.error("Failed to seed database:", err)
  process.exit(1)
})

export { seed }
