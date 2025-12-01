import { UserType, WorkspaceType } from "@/server/db/schema-types"
import { z } from "zod"

import { updateWorkspaceSchema, userSchema, workspaceSchema } from "@/lib/schemas"

// Type-safe API client
export class ApiClient {
  private static async fetch<T>({
    endpoint,
    ...config
  }: {
    endpoint: string
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
    body?: unknown
  }): Promise<T> {
    const res = await fetch(`/api${endpoint}`, {
      ...config,
      headers: {
        "Content-Type": "application/json",
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
    })

    const data = await res.json()

    if (!res.ok) {
      // Create a custom error with additional properties from the response
      const error = new Error(data.error || "An error occurred") as Error & {
        description?: string
        status?: number
      }

      // Add additional properties from the response
      if (data.description) error.description = data.description
      error.status = res.status

      throw error
    }

    return data as T
  }

  static async updateUser(data: UpdateUserRequest): Promise<ApiResponse> {
    return this.fetch({
      endpoint: `/users/${data.id}`,
      method: "PATCH",
      body: data.values,
    })
  }

  static async deleteUser(id: UserType["id"]): Promise<DeleteUserResponse> {
    return this.fetch({
      endpoint: `/users/${id}`,
      method: "DELETE",
    })
  }

  static async createWorkspace(data: CreateWorkspaceRequest): Promise<CreateWorkspaceResponse> {
    return this.fetch({
      endpoint: "/workspaces",
      method: "POST",
      body: data,
    })
  }

  static async updateWorkspace(data: UpdateWorkspaceRequest): Promise<UpdateWorkspaceResponse> {
    return this.fetch({
      endpoint: `/workspaces/${data.id}`,
      method: "PATCH",
      body: data.values,
    })
  }

  static async deleteWorkspace(id: WorkspaceType["id"]): Promise<DeleteWorkspaceResponse> {
    return this.fetch({
      endpoint: `/workspaces/${id}`,
      method: "DELETE",
    })
  }
}

interface ApiResponse {
  message: string
}

interface CreateWorkspaceResponse extends ApiResponse {
  slug: string
  workspace: Pick<WorkspaceType, "id" | "slug" | "name" | "logo" | "createdAt">
}

interface DeleteWorkspaceResponse extends ApiResponse {
  description: string
  redirectUrl: string
}

interface DeleteUserResponse extends ApiResponse {
  description: string
}

interface UpdateWorkspaceResponse extends ApiResponse {
  newSlug: string | null
  updatedWorkspace: Pick<WorkspaceType, "id" | "slug" | "name" | "logo" | "updatedAt">
}

export interface UpdateUserRequest {
  id: UserType["id"]
  values: z.infer<typeof userSchema>
}

export interface UpdateWorkspaceRequest {
  id: WorkspaceType["id"]
  values: z.infer<typeof updateWorkspaceSchema>
}

export interface CreateWorkspaceRequest {
  values: z.infer<typeof workspaceSchema>
}
