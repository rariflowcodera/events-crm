"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { userSchema } from "@/lib/schemas"
import { useEditProfileModal } from "@/hooks/use-edit-profile-modal"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Icons } from "@/components/global/icons"
import { ImageUpload } from "@/components/global/image-upload"

const userImageSchema = userSchema.pick({ image: true })

type EditProfileImageFormProps = {
  user: {
    id: string
    name: string
    email: string
    image: string | null
    lastName: string | null
    emailVerified: boolean
    createdAt: Date
    account: {
      provider: string
    } | null
  }
}
export function EditProfileImageForm({ user }: EditProfileImageFormProps) {
  const { email, image, lastName, name } = user

  const { open: openEditProfileModal } = useEditProfileModal()

  const form = useForm<z.infer<typeof userImageSchema>>({
    resolver: zodResolver(userImageSchema),
    defaultValues: {
      image: image ? image : undefined,
    },
  })

  return (
    <Form {...form}>
      <form className="space-y-4">
        <div className="flex items-center justify-between gap-x-2">
          <div className="flex items-start gap-x-2">
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                      }}
                      imageClassName="size-10 rounded-full"
                      className="size-10 rounded-full"
                      showActions={false}
                      disabled={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col">
              <p className="text-sm font-semibold">
                {name} {lastName}
              </p>
              <p className="text-muted-foreground text-sm">{email}</p>
            </div>
          </div>

          <Button variant={"secondary"} size={"sm"} type="button" onClick={openEditProfileModal}>
            <Icons.edit />
            Edit user
          </Button>
        </div>
      </form>
    </Form>
  )
}
