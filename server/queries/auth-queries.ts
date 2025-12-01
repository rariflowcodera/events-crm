"use server"

import { headers } from "next/headers"

import { auth } from "@/lib/auth"

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return {
      user: null,
    }
  }

  const { user } = session

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
    },
    session: {
      id: session.session.id,
    },
  }
}
