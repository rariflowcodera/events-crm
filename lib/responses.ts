import { NextApiResponse } from "next"
import { NextResponse } from "next/server"

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse

export interface ApiSuccessResponse<T = { [key: string]: any }> {
  data: T
  message: string
  success: true
  description?: string
}

export interface ApiErrorResponse {
  code:
    | "not_found"
    | "bad_request"
    | "internal_server_error"
    | "too_many_requests"
    | "unauthorized"
    | "method_not_allowed"
    | "not_authenticated"
  message: string
  description?: string
  details: {
    [key: string]: string | string[] | number | number[] | boolean | boolean[]
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
}

export type CustomNextApiResponse = NextApiResponse<ApiResponse>

const badRequestResponse = (
  message: string,
  description?: string,
  details?: { [key: string]: string },
  cors: boolean = false
) =>
  NextResponse.json(
    {
      code: "bad_request",
      message,
      description,
      details: details || {},
    } as ApiErrorResponse,
    {
      status: 400,
      ...(cors && { headers: corsHeaders }),
    }
  )

const missingFieldResponse = (field: string, cors: boolean = false) =>
  badRequestResponse(
    `Missing ${field}`,
    `The field ${field} is missing.`,
    {
      missing_field: field,
    },
    cors
  )

const notFoundResponse = (resourceType: string, resourceId: string, cors: boolean = false) =>
  NextResponse.json(
    {
      code: "not_found",
      message: `${resourceType} not found.`,
      details: {
        resource_id: resourceId,
        resource_type: resourceType,
      },
    } as ApiErrorResponse,
    {
      status: 404,
      ...(cors && { headers: corsHeaders }),
    }
  )

const notAuthenticatedResponse = (cors: boolean = false) =>
  NextResponse.json(
    {
      code: "not_authenticated",
      message: "You are not authenticated.",
      details: {
        "x-Api-Key": "Header not provided or session JWT token is invalid.",
      },
    } as ApiErrorResponse,
    {
      status: 401,
      ...(cors && { headers: corsHeaders }),
    }
  )

const unauthorizedResponse = (cors: boolean = false) =>
  NextResponse.json(
    {
      code: "unauthorized",
      message: "You are not authorized to access this resource",
      details: {},
    } as ApiErrorResponse,
    {
      status: 401,
      ...(cors && { headers: corsHeaders }),
    }
  )

const internalServerErrorResponse = (message: string, cors: boolean = false) =>
  NextResponse.json(
    {
      code: "internal_server_error",
      message,
      details: {},
    } as ApiErrorResponse,
    {
      status: 500,
      ...(cors && { headers: corsHeaders }),
    }
  )

const methodNotAllowedResponse = (
  res: CustomNextApiResponse,
  allowedMethods: string[],
  cors: boolean = false
) =>
  NextResponse.json(
    {
      code: "method_not_allowed",
      message: `The HTTP ${res.req?.method} method is not supported by this route.`,
      details: {
        allowed_methods: allowedMethods,
      },
    } as ApiErrorResponse,
    {
      status: 405,
      ...(cors && { headers: corsHeaders }),
    }
  )

const successResponse = <T>(
  data: T,
  message: string,
  description?: string,
  cors: boolean = false
) =>
  new NextResponse(
    JSON.stringify({
      success: true,
      data,
      message,
      description,
    } as ApiSuccessResponse<typeof data>),
    {
      status: 200,
      ...(cors && { headers: corsHeaders }),
    }
  )

const tooManyRequestsResponse = (message?: string, retryAfter?: number, cors: boolean = false) =>
  NextResponse.json(
    {
      code: "too_many_requests",
      message: message ?? "Too many requests, please try again later",
      details: {
        ...(retryAfter && { retry_after: retryAfter }),
      },
    } as ApiErrorResponse,
    {
      status: 429,
      headers: {
        ...(retryAfter && { "Retry-After": retryAfter.toString() }),
        ...(cors && corsHeaders),
      },
    }
  )

export const responses = {
  badRequestResponse,
  notFoundResponse,
  notAuthenticatedResponse,
  internalServerErrorResponse,
  methodNotAllowedResponse,
  successResponse,
  unauthorizedResponse,
  missingFieldResponse,
  tooManyRequestsResponse,
}
