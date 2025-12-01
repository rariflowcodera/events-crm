import { ZodError } from "zod"

export function formatZodError(error: ZodError) {
  const firstError = error.errors[0]
  if (!firstError) return "Validation error occurred"

  // Get field name from path or default to "Value"
  const field =
    firstError.path.length > 0 ? firstError.path[firstError.path.length - 1].toString() : "Value"

  // Capitalize field name
  const fieldName = field.charAt(0).toUpperCase() + field.slice(1)

  // Handle common error codes
  switch (firstError.code) {
    case "invalid_string":
      if (firstError.validation === "email") {
        return "Please enter a valid email address"
      }
      if (firstError.validation === "url") {
        return "Please enter a valid URL"
      }
      return `${fieldName} is invalid`

    case "too_small":
      return `${fieldName} must be at least ${firstError.minimum} characters`

    case "too_big":
      return `${fieldName} must be at most ${firstError.maximum} characters`

    case "invalid_type":
      return `${fieldName} is required`

    default:
      return firstError.message || "Invalid input"
  }
}
