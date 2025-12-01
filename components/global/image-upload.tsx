"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { getPreSignedUrl, uploadFileToS3 } from "@/server/hooks/use-image-upload"
import { useUpdateUserImageTRPC } from "@/trpc/hooks/users-hooks"
import { useUpdateWorkspaceLogoTRPC } from "@/trpc/hooks/workspaces-hooks"
import Dropzone from "react-dropzone"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/global/icons"

type ImageUploadProps = {
  value: string | null | undefined
  onChange: (url?: string, name?: string) => void
  type?: "profile" | "logo"
  disabled?: boolean
  showActions?: boolean
  className?: string
  imageClassName?: string
  workspaceId?: string
}

export function ImageUpload({
  value,
  onChange,
  type = "profile",
  disabled = false,
  className,
  imageClassName,
  showActions = false,
  workspaceId,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleReupload = () => {
    onChange("")
  }

  const { mutate: updateProfileImage } = useUpdateUserImageTRPC()

  const { mutate: updateWorkspaceLogo } = useUpdateWorkspaceLogoTRPC()

  const handleFileDrop = async (file: File) => {
    try {
      setIsUploading(true)
      const data = await getPreSignedUrl(file)

      if (!data || !data.data) {
        setIsUploading(false)
        return toast.error("Too many requests. Please try again later.")
      }

      const storageProvider = data.data.storageProvider || "s3"
      const uploadUrl =
        storageProvider === "local" ? data.data.uploadUrl : data.data.preSignedUrl

      if (!uploadUrl) {
        setIsUploading(false)
        return toast.error("Failed to get upload URL")
      }

      const uploadResult = await uploadFileToS3(uploadUrl, file, storageProvider)

      if (uploadResult) {
        // For local storage, the uploadResult contains the actual imageUrl
        const imageUrl =
          storageProvider === "local" && typeof uploadResult === "string"
            ? uploadResult
            : data.data.imageUrl

        const uploadedFile = {
          originalFileName: file.name,
          uploadedUrl: imageUrl,
        }

        onChange(uploadedFile.uploadedUrl, uploadedFile.originalFileName)
        if (type === "profile" && !showActions) {
          updateProfileImage({ image: uploadedFile.uploadedUrl })
        }

        if (type === "logo" && workspaceId) {
          updateWorkspaceLogo({ logo: uploadedFile.uploadedUrl, id: workspaceId })
        }
      }
      setIsUploading(false)
    } catch (error: any) {
      toast.error(error)
    }
  }

  return (
    <div className="flex items-start gap-x-4">
      <Dropzone
        multiple={false}
        disabled={disabled}
        onDrop={async (acceptedFile: File[]) => {
          const file = acceptedFile[0]
          const validImageTypes = [
            "image/gif",
            "image/jpeg",
            "image/png",
            "image/webp",
            // "image/svg",
          ]

          if (file && validImageTypes.includes(file.type)) {
            handleFileDrop(file)
          } else {
            // Show an error message
            toast.error("Invalid file type. Please select an image file.")
          }
        }}
      >
        {({ getRootProps, getInputProps, open }) => (
          <>
            <div
              {...getRootProps()}
              className={cn(
                "border-border hover:bg-card relative flex size-[4.5rem] max-h-[4.5rem] max-w-[4.5rem] cursor-pointer items-center justify-center rounded-md border transition-colors",
                className,
                {
                  "overflow-hidden": !value,
                }
              )}
              aria-label="Image upload"
            >
              {value ? (
                <div className="group relative size-full">
                  <Image
                    src={value as string}
                    alt="Profile Image"
                    width={400}
                    height={400}
                    className={cn(
                      "bg-muted size-full cursor-pointer overflow-hidden rounded-md object-cover transition-all duration-200",
                      imageClassName,
                      disabled && "cursor-not-allowed",
                      "group-hover:brightness-75 dark:group-hover:brightness-50"
                    )}
                  />
                  {(type === "profile" || type === "logo") && !showActions && (
                    <Button
                      size={"icon"}
                      className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 transform opacity-0 transition-opacity group-hover:opacity-100 hover:border-transparent hover:bg-transparent"
                      variant={"ghost"}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        open()
                      }}
                    >
                      <span className="sr-only">Edit image</span>
                      <Icons.edit
                        className={cn("size-4 text-black/70 dark:text-white/70", {
                          "size-8": type === "logo",
                        })}
                      />
                    </Button>
                  )}
                </div>
              ) : (
                <div
                  className={cn(
                    "hover:bg-muted bg-os-background-100 flex size-full cursor-pointer items-center justify-center",
                    {
                      "cursor-not-allowed opacity-60": disabled,
                      "rounded-full": !showActions && type === "profile",
                    }
                  )}
                >
                  {isUploading ? (
                    <Icons.loader
                      className={cn("size-5 animate-spin", {
                        "size-4": !showActions && type === "profile",
                      })}
                    />
                  ) : (
                    <Icons.upload
                      className={cn("size-5", {
                        "size-4": !showActions && type === "profile",
                      })}
                    />
                  )}
                </div>
              )}
              <input
                {...getInputProps()}
                className="hidden"
                accept="image/*"
                type="file"
                id="dropzone-file"
                disabled={disabled}
                ref={fileInputRef}
              />
            </div>
            <div
              className={cn("grid gap-y-2", {
                "sr-only": !showActions,
              })}
            >
              <span className="text-xs">{type === "profile" ? "Profile image" : "Image"}</span>

              <div className="flex items-center gap-x-2">
                <Button
                  {...getRootProps()}
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={disabled}
                >
                  <Icons.upload />
                  Upload image
                  <input
                    {...getInputProps()}
                    className="hidden"
                    accept="image/*"
                    type="file"
                    id="dropzone-file"
                    disabled={disabled}
                  />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!value || disabled}
                  onClick={handleReupload}
                >
                  Remove
                </Button>
              </div>
              <p className="text-muted-foreground text-[11px]">
                *.png, *.jpeg files up to 2MB at least 400px by 400px
              </p>
            </div>
          </>
        )}
      </Dropzone>
    </div>
  )
}

type ImageUploadSkeletonProps = {
  rounded?: "full" | "md"
}

export function ImageUploadSkeleton({ rounded = "md" }: ImageUploadSkeletonProps) {
  return (
    <div className="flex items-start gap-x-4">
      <Skeleton
        className={cn("relative size-16", {
          "rounded-full": rounded === "full",
          "rounded-md": rounded === "md",
        })}
      />
    </div>
  )
}
