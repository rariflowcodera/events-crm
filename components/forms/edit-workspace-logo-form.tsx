"use client"

import { WorkspaceType } from "@/server/db/schema-types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { workspaceSchema } from "@/lib/schemas"
import { CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ImageUpload } from "@/components/global/image-upload"

const workspaceLogoSchema = workspaceSchema.pick({ logo: true })

type EditWorkspaceLogoFormProps = {
  logo: WorkspaceType["logo"]
  id: WorkspaceType["id"]
  name: WorkspaceType["name"]
  slug: WorkspaceType["slug"]
}

export function EditWorkspaceLogoForm({ logo, id, name, slug }: EditWorkspaceLogoFormProps) {
  const logoForm = useForm<z.infer<typeof workspaceLogoSchema>>({
    resolver: zodResolver(workspaceLogoSchema),
    defaultValues: { logo },
  })

  return (
    <Form {...logoForm}>
      <form>
        <CardContent className="grid">
          <div className="flex items-center justify-between gap-x-2">
            <div className="flex items-start gap-x-2">
              <FormField
                control={logoForm.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Image</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value)
                        }}
                        showActions={false}
                        disabled={false}
                        type="logo"
                        workspaceId={id}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-x-2">
                  <p className="font-semibold">{name}</p>
                </div>
                <p className="text-muted-foreground text-sm">{slug}</p>

                <span className="text-muted-foreground mt-1 text-xs">
                  Recommended logo size is 512x512
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </form>
    </Form>
  )
}
