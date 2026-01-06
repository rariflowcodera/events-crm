"use client"

import { useTranslations } from "next-intl"
import { ChevronDown, Mail, FileText, Car, Trash2, Link2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type BulkAction =
  | "delete"
  | "send_invitation"
  | "send_email"
  | "update_status"
  | "get_form_link"
  | "get_vapp_link"
  | "generate_email_link"
  | "copy_rsvp_link"
  | "copy_short_rsvp_link"

interface GuestActionsDropdownProps {
  selectedCount: number
  onAction: (action: BulkAction) => void
  canSendEmails: boolean
  canManageGuests: boolean
  canDeleteGuests: boolean
  vappEnabled?: boolean
  hasShortRsvpCode?: boolean
}

export function GuestActionsDropdown({
  selectedCount,
  onAction,
  canSendEmails,
  canManageGuests,
  canDeleteGuests,
  vappEnabled = false,
  hasShortRsvpCode = false,
}: GuestActionsDropdownProps) {
  const t = useTranslations("guestActions")
  const isSingleSelection = selectedCount === 1

  // Helper to render an action item with tooltip when disabled
  const ActionItem = ({
    action,
    icon: Icon,
    label,
    disabled,
    disabledReason,
    destructive = false,
  }: {
    action: BulkAction
    icon: React.ComponentType<{ className?: string }>
    label: string
    disabled: boolean
    disabledReason?: string
    destructive?: boolean
  }) => {
    const item = (
      <DropdownMenuItem
        onClick={() => !disabled && onAction(action)}
        disabled={disabled}
        className={destructive ? "text-destructive focus:text-destructive" : ""}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </DropdownMenuItem>
    )

    if (disabled && disabledReason) {
      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{item}</div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{disabledReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return item
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-green-500/15 border border-green-500/30">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-2">
            {t("actions")}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Bulk actions (work with any selection) */}
          <ActionItem
            action="send_invitation"
            icon={Mail}
            label={t("sendInvitation")}
            disabled={!canSendEmails}
            disabledReason={!canSendEmails ? t("noEmailPermission") : undefined}
          />
          <ActionItem
            action="send_email"
            icon={Mail}
            label={t("sendEmail")}
            disabled={!canSendEmails}
            disabledReason={!canSendEmails ? t("noEmailPermission") : undefined}
          />
          <ActionItem
            action="update_status"
            icon={RefreshCw}
            label={t("updateStatus")}
            disabled={!canManageGuests}
            disabledReason={!canManageGuests ? t("noManagePermission") : undefined}
          />

          <DropdownMenuSeparator />

          {/* Single-only actions */}
          <ActionItem
            action="generate_email_link"
            icon={Link2}
            label={t("generateEmailLink")}
            disabled={!isSingleSelection || !canSendEmails}
            disabledReason={
              !isSingleSelection
                ? t("selectOneGuest")
                : !canSendEmails
                  ? t("noEmailPermission")
                  : undefined
            }
          />
          <ActionItem
            action="get_form_link"
            icon={FileText}
            label={t("getFormLink")}
            disabled={!isSingleSelection || !canSendEmails}
            disabledReason={
              !isSingleSelection
                ? t("selectOneGuest")
                : !canSendEmails
                  ? t("noEmailPermission")
                  : undefined
            }
          />
          {vappEnabled && (
            <ActionItem
              action="get_vapp_link"
              icon={Car}
              label={t("vappLink")}
              disabled={!isSingleSelection}
              disabledReason={!isSingleSelection ? t("selectOneGuest") : undefined}
            />
          )}
          <ActionItem
            action="copy_rsvp_link"
            icon={Link2}
            label={t("copyRsvpLink")}
            disabled={!isSingleSelection}
            disabledReason={!isSingleSelection ? t("selectOneGuest") : undefined}
          />
          {hasShortRsvpCode && (
            <ActionItem
              action="copy_short_rsvp_link"
              icon={Link2}
              label={t("copyShortRsvpLink")}
              disabled={!isSingleSelection}
              disabledReason={!isSingleSelection ? t("selectOneGuest") : undefined}
            />
          )}

          <DropdownMenuSeparator />

          {/* Destructive actions */}
          <ActionItem
            action="delete"
            icon={Trash2}
            label={t("delete")}
            disabled={!canDeleteGuests}
            disabledReason={!canDeleteGuests ? t("noDeletePermission") : undefined}
            destructive
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
