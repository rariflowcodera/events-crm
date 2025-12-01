"use client"

import { useCreateWorkspaceModal } from "@/hooks/use-create-workspace-modal"
import { useEditProfileModal } from "@/hooks/use-edit-profile-modal"
import { useCreateEventModal } from "@/hooks/use-create-event-modal"
import { CreateWorkspaceModal } from "@/components/modals/create-workspace-modal"
import { EditProfileModal } from "@/components/modals/edit-profile-modal"
import { CreateEventModal } from "@/components/modals/create-event-modal"

export function ModalProvider() {
  const { isOpen: isEditProfileModalOpen } = useEditProfileModal()
  const { isOpen: isCreateWorkspaceModalOpen } = useCreateWorkspaceModal()
  const { isOpen: isCreateEventModalOpen } = useCreateEventModal()

  return (
    <>
      {isEditProfileModalOpen ? <EditProfileModal /> : null}
      {isCreateWorkspaceModalOpen ? <CreateWorkspaceModal /> : null}
      {isCreateEventModalOpen ? <CreateEventModal /> : null}
    </>
  )
}
