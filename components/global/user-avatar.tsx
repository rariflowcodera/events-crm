"use client"

import { UserType } from "@/server/db/schema-types"
import { AvatarProps } from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps extends AvatarProps {
  user: Pick<UserType, "image" | "name" | "email">
  size?: "xxs" | "xs" | "ssm" | "sm" | "md" | "lg" | "xl" | "2xl"
  className?: string
}

export function UserAvatar({ user, className, ...props }: UserAvatarProps) {
  return (
    <Avatar
      {...props}
      className={cn("flex size-8 items-center justify-center rounded-md", className, {
        "size-5": props.size === "xxs",
        "size-[26px]": props.size === "xs",
        "size-8": props.size === "ssm",
        "size-9": props.size === "sm",
        "size-10": props.size === "md",
      })}
    >
      {user.image ? (
        <AvatarImage alt="User profile picture" src={user.image} className="bg-primary/[0.03]" />
      ) : (
        <AvatarFallback className="rounded-md">
          <span
            className={cn("select-none", {
              "text-xs": props.size === "xxs",
              "text-sm": props.size === "sm",
              "text-base": props.size === "md",
            })}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
          </span>
          <span className="sr-only">{user.name}</span>
        </AvatarFallback>
      )}
    </Avatar>
  )
}
