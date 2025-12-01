"use client"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

type ResponsiveModalProps = {
  // Core props
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  children: React.ReactNode

  // Styling
  modalClassName?: string
  mobileDrawerClassName?: string

  // Modal elements
  headerTitle?: string
  headerDescription?: string
  footerContent?: React.ReactNode

  // Accessibility
  isHeaderHidden?: boolean
}

export function ResponsiveModal({
  // More semantic naming
  isOpen,
  onOpenChange,
  children,
  modalClassName,
  mobileDrawerClassName,
  headerTitle,
  headerDescription,
  footerContent,
  isHeaderHidden,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()

  if (!isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "hide-scrollbar bg-os-background-100 max-h-[85dvh] w-full overflow-y-auto sm:max-w-lg",
            modalClassName
          )}
        >
          <DialogHeader
            className={cn({
              "sr-only": isHeaderHidden,
            })}
          >
            {headerTitle && <DialogTitle>{headerTitle}</DialogTitle>}
            {headerDescription && <DialogDescription>{headerDescription}</DialogDescription>}
          </DialogHeader>

          {children}

          {footerContent && <DialogFooter>{footerContent}</DialogFooter>}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          "hide-scrollbar bg-os-background-100 max-h-[85dvh] min-h-fit overflow-y-auto",
          mobileDrawerClassName
        )}
      >
        <DrawerHeader>
          {headerTitle && <DrawerTitle>{headerTitle}</DrawerTitle>}
          {headerDescription && <DrawerDescription>{headerDescription}</DrawerDescription>}
        </DrawerHeader>

        <div className={cn("flex h-fit items-center justify-center p-4")}>{children}</div>
        {footerContent && <DrawerFooter>{footerContent}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  )
}
