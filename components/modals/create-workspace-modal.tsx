"use client"

import { useCreateWorkspaceModal } from "@/hooks/use-create-workspace-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CreateWorkspaceForm } from "@/components/forms/create-workspace-form"

export function CreateWorkspaceModal() {
  const { isOpen, close } = useCreateWorkspaceModal()

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="h-full w-full max-w-full overflow-hidden rounded-xl border sm:max-w-5xl md:mt-6 md:mr-6 md:mb-6 md:h-[calc(100dvh-48px)]">
        <SheetHeader className="sticky -top-6 z-50 pt-12 text-center sm:text-left md:px-12 md:pb-4 lg:px-6">
          <SheetTitle className="text-lg">Create a new workspace</SheetTitle>
          <SheetDescription>Create a new workspace in Boring Template</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-full">
          <CreateWorkspaceForm
            hasMailPreview
            className="p-6 md:min-h-[700px] md:pr-0 md:pl-12 lg:pr-0 lg:pl-6"
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
