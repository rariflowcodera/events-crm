"use client"

import Image from "next/image"
import { UserType, WorkspaceType } from "@/server/db/schema-types"

import { configuration } from "@/lib/config"
import { LOGO, RIGHT_ARROW } from "@/lib/constants"

type InvitationMailPreviewProps = {
  user: {
    name: UserType["name"]
    image: UserType["image"]
  }
  workspace: {
    name: WorkspaceType["name"]
    logo: WorkspaceType["logo"]
  }
}

export function InvitationMailPreview({ user, workspace }: InvitationMailPreviewProps) {
  // Use fallback images when user.image or workspace.logo are empty or undefined
  const userImage = user.image
  const workspaceLogo = workspace.logo
  const userName = user.name || "User"
  const workspaceName = workspace.name || "Workspace"

  return (
    <div className="pointer-events-none flex aspect-square items-center justify-center rounded-md border bg-white md:min-h-[550px]">
      <div className="mx-auto w-full max-w-[450px] rounded-md bg-white p-5">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="relative mx-auto my-0 h-12 w-12 overflow-hidden rounded-full">
            <Image
              src={configuration.site.logo}
              alt={`${configuration.site.name} Logo`}
              width={48}
              height={48}
              className="object-cover"
            />
          </div>
          <h2 className="mt-6 max-w-[30ch] truncate text-xl font-normal text-black">
            Join <strong className="">{workspaceName}</strong> on{" "}
            <strong>{configuration.site.name}</strong>
          </h2>
        </div>

        {/* Email content */}
        <div className="mb-4 text-sm text-black">
          <p>Hello, john.doe@gmail.com</p>
          <p className="mt-2 max-w-[50ch] truncate">
            <strong>{userName}</strong> has invited you to <strong>{workspaceName}</strong> team on{" "}
            <strong>{configuration.site.name}</strong>
          </p>
        </div>

        {/* User and workspace images */}
        <div className="my-6 flex items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-zinc-200 p-1.5">
            {userImage && userImage !== "undefined" ? (
              <Image
                src={userImage}
                width={64}
                height={64}
                alt={userName}
                className="rounded-full"
              />
            ) : (
              <span className="text-lg font-semibold text-black uppercase">
                {userName.slice(0, 2)}
              </span>
            )}
          </div>

          <div className="mx-2">
            <Image src={RIGHT_ARROW} width={12} height={9} alt="invited you to" />
          </div>

          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-zinc-200 p-1.5">
            <Image
              src={workspaceLogo && workspaceLogo !== "undefined" ? workspaceLogo : LOGO}
              width={64}
              height={64}
              alt={workspaceName}
              className="rounded-full"
            />
          </div>
        </div>

        {/* Button */}
        <div className="my-6 text-center">
          <button className="rounded bg-black px-7 py-4 text-center text-xs font-semibold text-white">
            Join the team
          </button>
        </div>

        <div className="pt-3 text-sm text-black">
          <p className="line-clamp-2">
            or copy and paste this URL into your browser:{" "}
            <a href="#" className="text-blue-600">
              {configuration.site.domain}/invite/{workspaceName}
            </a>
          </p>
        </div>

        <hr className="my-6 border-t border-gray-200" />

        <p className="text-xs text-gray-500">
          This invitation was intended for <span className="text-black">john.doe@gmail.com</span>.
          If you were not expecting this invitation, you can ignore this email.
        </p>
      </div>
    </div>
  )
}
