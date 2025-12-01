import { Metadata } from "next"
import { MemberType, PermissionType, UserType } from "@/server/db/schema-types"

import { auth } from "@/lib/auth"
import { Icons } from "@/components/global/icons"

export type PlaceholderImageType = {
  backgroundColor?: string
  textColor?: string
  textRows?: string[]
}

export type MetadataType = Metadata & {
  href: string
  name: string
  image?: string
  disabled?: boolean
  icon?: keyof typeof Icons
  children?: MetadataType[]
}

export const RoleTypes = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  MEMBER: "member",
} as const

export type RoleTypesType = (typeof RoleTypes)[keyof typeof RoleTypes]

export const InvitationStatusTypes = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const

export type InvitationStatusTypesType =
  (typeof InvitationStatusTypes)[keyof typeof InvitationStatusTypes]

export type UserWithRoleType = {
  id: UserType["id"]
  name: UserType["name"]
  email: UserType["email"]
  image: UserType["image"]
  role: PermissionType["name"]
  status: MemberType["status"]
}

export type ConfigurationType = {
  site: {
    name: string
    description: string
    shortDescription: string
    domain: string
    logo: string

    defaultTheme: "dark" | "light"
    siteUrl: string
    openGraphImage: string
    openGraphTitle: string
    openGraphDescription: string
    contactEmail: string
    xHandle: string
    xUrl: string
    githubHandle: string
  }

  smtp: {
    from: string
  }
}

export type SessionType = typeof auth.$Infer.Session
