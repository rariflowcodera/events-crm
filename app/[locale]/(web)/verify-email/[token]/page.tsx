import Link from "next/link"
import { db, dbClient } from "@/server/db/config/database"
import { emailVerifications, users } from "@/server/db/schemas"
import { getCurrentUser } from "@/server/queries/auth-queries"
import { eq } from "drizzle-orm"

import { configuration } from "@/lib/config"
import { createRoute, redirectToRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type VerifyEmailPageProps = {
  params: Promise<{
    token: string
  }>
}

export default async function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const { token } = await params

  const [{ user }, [emailVerification]] = await Promise.all([
    getCurrentUser(),
    db
      .select()
      .from(emailVerifications)
      .leftJoin(users, eq(emailVerifications.userId, users.id))
      .where(eq(emailVerifications.token, token))
      .limit(1),
  ])

  if (!user) {
    return redirectToRoute("sign-in")
  }

  if (!emailVerification) {
    return <div>Did not find email verification</div>
  }

  if (!emailVerification.user) {
    return <div>Did not find user</div>
  }

  if (emailVerification.email_verification.expiresAt < new Date()) {
    return <div>Email verification expired</div>
  }

  if (emailVerification.user.email !== user.email) {
    return <div>Email does not match</div>
  }

  await dbClient.transaction(async (trx) => {
    await trx
      .update(users)
      .set({ email: emailVerification.email_verification.newEmail, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    await trx
      .update(emailVerifications)
      .set({ usedAt: new Date(), updatedAt: new Date() })
      .where(eq(emailVerifications.id, emailVerification.email_verification.id))
  })

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-y-6">
      <span className="text-lg font-semibold">{configuration.site.name}</span>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-sm">Email verified</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">Your email has been verified</p>
        </CardContent>
        <CardFooter>
          <Link
            href={createRoute("callback").href}
            className={cn(buttonVariants({ className: "mx-auto" }))}
          >
            Continue to Application
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
