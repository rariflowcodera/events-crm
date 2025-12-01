import { config } from "dotenv"
// Load env before other imports that depend on process.env
config({ path: ".env.local" })

import * as schema from "@/server/db/schemas"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
})

export const db = drizzle(pool, { schema })
export const dbClient = db
