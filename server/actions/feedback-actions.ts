// "use server"

// import { getCurrentUser } from "@/server/actions/auth-actions"
// import {
//   ApiError,
//   AuthenticationError,
//   DatabaseError,
//   RateLimitError,
//   ValidationError,
// } from "@/server/exceptions/exceptions"
// import { formatZodError } from "@/server/utils/format-zod-error"
// import { Ratelimit } from "@upstash/ratelimit"
// import { z } from "zod"

// import { configuration } from "@/lib/config"
// import { RATE_LIMIT_1_MINUTE, RATE_LIMIT_5 } from "@/lib/constants"
// import { redis } from "@/lib/redis"
// import { resend } from "@/lib/resend"
// import { feedbackSchema } from "@/lib/schemas"
// import { FeedbackMail } from "@/components/feedback/feedback-mail"

// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(RATE_LIMIT_5, RATE_LIMIT_1_MINUTE),
// })

// // export const sendFeedback = async ({ values }: { values: z.infer<typeof feedbackSchema> }) => {
// //   try {
// //     const validateFeedback = feedbackSchema.safeParse(values)

// //     if (!validateFeedback.success) {
// //       throw new ValidationError(formatZodError(validateFeedback.error))
// //     }

// //     const { user } = await getCurrentUser()

// //     if (!user) {
// //       throw new AuthenticationError()
// //     }

// //     const identifier = `ratelimit:send-feedback:${user.id}`
// //     const { success: rateLimitSuccess } = await ratelimit.limit(identifier)
// //     if (!rateLimitSuccess) {
// //       throw new RateLimitError("Too many feedbacks sent")
// //     }

// //     const { feedback } = validateFeedback.data

// //     const result = await resend.emails.send({
// //       from: configuration.resend.email,
// //       to: configuration.site.contactEmail,
// //       subject: `Feedback from ${user.name} | ${configuration.site.name}`,
// //       react: FeedbackMail({ feedback, fromUser: user }),
// //     })

// //     if (result.error) {
// //       throw new ApiError("Failed to send feedback")
// //     }

// //     return {
// //       success: true,
// //       status: 200,
// //       message: "Feedback sent successfully",
// //       description: "Thank you for your feedback!",
// //     }
// //   } catch (error: any) {
// //     if (error instanceof ApiError) {
// //       throw error
// //     }

// //     throw new DatabaseError("Failed to send feedback", "An unexpected error occurred")
// //   }
// // }
