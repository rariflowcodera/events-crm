"use client"

import { useEditProfileModal } from "@/hooks/use-edit-profile-modal"
import { EditProfileForm } from "@/components/forms/edit-profile-form"
import { ResponsiveModal } from "@/components/global/responsive-modal"

export function EditProfileModal() {
  const { isOpen, close } = useEditProfileModal()

  return (
    <ResponsiveModal
      onOpenChange={close}
      isOpen={isOpen}
      headerTitle="Edit profile"
      headerDescription="Edit profile information"
    >
      <EditProfileForm isOpen={isOpen} />
    </ResponsiveModal>
  )
}
