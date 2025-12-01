import { db } from "@/server/db/config/database"
import { invitations } from "@/server/db/schemas"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

export async function generateUniqueToken() {
  let token
  let tokenExists = true

  while (tokenExists) {
    token = uuidv4()
    const existingToken = await db.query.invitations.findFirst({
      where: eq(invitations.token, token),
    })
    tokenExists = !!existingToken
  }

  return token
}
