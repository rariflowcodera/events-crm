"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeftIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { useBackNavigation } from "@/hooks/use-back-navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PagePanelProps {
  /** Panel title displayed in header */
  title: string
  /** Optional description displayed below title */
  description?: string
  /** Panel content */
  children: React.ReactNode
  /** Fallback URL when no history is available */
  backHref?: string
  /** Optional className for the content container */
  className?: string
  /** Whether the panel is open (always true for route-based usage) */
  open?: boolean
  /** Skip ScrollArea wrapper (when content handles own scrolling) */
  noScroll?: boolean
}

/**
 * PagePanel - A responsive panel component for route-based content
 *
 * - Desktop: Full-width overlay covering content area (sidebar stays visible)
 * - Mobile: Full-screen with swipe-back gesture support via vaul Drawer
 *
 * Used for detail pages like guest profiles, forms, and wizards.
 */
export function PagePanel({
  title,
  description,
  children,
  backHref,
  className,
  open = true,
  noScroll = false,
}: PagePanelProps) {
  const isMobile = useIsMobile()
  const { goBack } = useBackNavigation(backHref)

  // Mobile: Full-screen Drawer with swipe gesture
  if (isMobile) {
    return (
      <DrawerPrimitive.Root
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) goBack()
        }}
        direction="right"
        dismissible
      >
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <DrawerPrimitive.Content
            className={cn(
              "bg-background fixed inset-0 z-50 flex flex-col",
              // Slide in from right
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
              "duration-300"
            )}
          >
            {/* Mobile Header */}
            <header className="bg-background sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="shrink-0 -ml-2"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <DrawerPrimitive.Title className="font-semibold truncate">
                  {title}
                </DrawerPrimitive.Title>
                {description && (
                  <DrawerPrimitive.Description className="text-muted-foreground text-sm truncate">
                    {description}
                  </DrawerPrimitive.Description>
                )}
              </div>
            </header>

            {/* Mobile Content - overflow-hidden prevents drawer from showing scrollbars */}
            <div className="flex-1 overflow-hidden">
              {noScroll ? (
                <div className={cn("h-full p-4", className)}>{children}</div>
              ) : (
                <div className={cn("h-full p-4 overflow-auto", className)}>
                  {children}
                </div>
              )}
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    )
  }

  // Desktop: Full-width overlay covering content area
  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 md:left-[var(--sidebar-width)]"
            onClick={goBack}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "bg-background fixed inset-y-0 right-0 z-50 flex flex-col shadow-xl",
              // Start at sidebar edge on desktop
              "md:left-[var(--sidebar-width)]"
            )}
          >
            {/* Desktop Header */}
            <header className="bg-background sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goBack}
                  className="shrink-0 -ml-2"
                  aria-label="Go back"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="font-semibold text-lg truncate">{title}</h1>
                  {description && (
                    <p className="text-muted-foreground text-sm truncate">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="shrink-0"
                aria-label="Close panel"
              >
                <XIcon className="h-5 w-5" />
              </Button>
            </header>

            {/* Desktop Content - overflow-hidden prevents PagePanel from showing scrollbars */}
            <div className="flex-1 overflow-hidden">
              {noScroll ? (
                <div className={cn("h-full p-6", className)}>{children}</div>
              ) : (
                <ScrollArea className="h-full">
                  <div className={cn("p-6", className)}>{children}</div>
                </ScrollArea>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * PagePanelSection - A section within a PagePanel
 */
export function PagePanelSection({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title && <h2 className="font-medium text-sm text-muted-foreground">{title}</h2>}
      {children}
    </section>
  )
}

/**
 * PagePanelFooter - Fixed footer for actions
 */
export function PagePanelFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <footer
      className={cn(
        "bg-background sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t px-6 py-4",
        className
      )}
    >
      {children}
    </footer>
  )
}
