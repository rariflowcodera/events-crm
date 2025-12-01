export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public description?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Authentication & Authorization (401, 403)
export class AuthenticationError extends ApiError {
  constructor(message: string = "Not authenticated", description?: string) {
    super(message, 401, description)
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = "Not authorized", description?: string) {
    super(message, 403, description)
    this.name = "AuthorizationError"
  }
}

// Rate Limiting (429)
export class RateLimitError extends ApiError {
  constructor(message: string = "Too many requests", description?: string) {
    super(message, 429, description)
    this.name = "RateLimitError"
  }
}

// Resource Errors (404, 409)
export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found", description?: string) {
    super(message, 404, description)
    this.name = "NotFoundError"
  }
}

export class ConflictError extends ApiError {
  constructor(
    message: string = "Resource already exists",
    description?: string
  ) {
    super(message, 409, description)
    this.name = "ConflictError"
  }
}

// Validation Errors (400)
export class ValidationError extends ApiError {
  constructor(message: string = "Validation failed", description?: string) {
    super(message, 400, description)
    this.name = "ValidationError"
  }
}

// Subscription/Payment Errors (402)
export class PaymentError extends ApiError {
  constructor(message: string = "Payment required", description?: string) {
    super(message, 402, description)
    this.name = "PaymentError"
  }
}

// Quota/Limit Errors (403)
export class QuotaExceededError extends ApiError {
  constructor(message: string = "Quota exceeded", description?: string) {
    super(message, 403, description)
    this.name = "QuotaExceededError"
  }
}

// Server Errors (500, 503)
export class ServerError extends ApiError {
  constructor(message: string = "Internal server error", description?: string) {
    super(message, 500, description)
    this.name = "ServerError"
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = "Service unavailable", description?: string) {
    super(message, 503, description)
    this.name = "ServiceUnavailableError"
  }
}

// Database Errors (500)
export class DatabaseError extends ApiError {
  constructor(message: string = "Database error", description?: string) {
    super(message, 500, description)
    this.name = "DatabaseError"
  }
}

// External Service Errors (502)
export class ExternalServiceError extends ApiError {
  constructor(
    message: string = "External service error",
    description?: string
  ) {
    super(message, 502, description)
    this.name = "ExternalServiceError"
  }
}
