import { parseAsBoolean, useQueryState } from "nuqs"

export const useEditProfileModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "edit-profile",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  )

  const open = () => {
    setIsOpen(true)
  }
  const close = () => {
    setIsOpen(false)
  }
  return {
    open,
    close,
    isOpen,
    setIsOpen,
  }
}
