"use client"

import { useGuestEmailLogs } from "@/trpc/hooks/email-hooks"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  AlertTriangle,
  Loader2,
  Ban,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

interface GuestEmailHistoryProps {
  guestId: string
}

type EmailStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed"

const statusConfig: Record<
  EmailStatus,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  queued: { icon: Clock, color: "text-blue-500", label: "Queued" },
  sent: { icon: CheckCircle2, color: "text-green-600", label: "Sent" },
  delivered: { icon: CheckCircle2, color: "text-green-600", label: "Delivered" },
  opened: { icon: Mail, color: "text-blue-600", label: "Opened" },
  clicked: { icon: Mail, color: "text-purple-600", label: "Clicked" },
  bounced: { icon: XCircle, color: "text-destructive", label: "Bounced" },
  failed: { icon: AlertTriangle, color: "text-orange-500", label: "Failed" },
}

export function GuestEmailHistory({ guestId }: GuestEmailHistoryProps) {
  const { data: logs, isLoading } = useGuestEmailLogs(guestId, 20)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Mail className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">
            No emails have been sent to this guest yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const config = statusConfig[log.status as EmailStatus]
        const Icon = config?.icon || Clock
        const providerResponse = log.providerResponse as {
          reason?: string
          blockedBySuppression?: boolean
        } | null

        return (
          <Card key={log.id}>
            <CardContent className="py-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config?.color || "text-muted-foreground"}`}>
                    {providerResponse?.blockedBySuppression ? (
                      <Ban className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {log.template?.name || "Unknown Template"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.template?.type || "custom"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                      {log.subject}
                    </p>
                    {providerResponse?.reason && (
                      <p className="text-xs text-destructive">
                        {providerResponse.blockedBySuppression
                          ? "Blocked: recipient on suppression list"
                          : `Reason: ${providerResponse.reason}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      log.status === "bounced" || log.status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {providerResponse?.blockedBySuppression
                      ? "Suppressed"
                      : config?.label || log.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/**
 * Compact email status indicator for use in tables
 */
interface GuestEmailStatusIndicatorProps {
  guestId: string
}

export function GuestEmailStatusIndicator({
  guestId,
}: GuestEmailStatusIndicatorProps) {
  const { data: logs, isLoading } = useGuestEmailLogs(guestId, 5)

  if (isLoading) {
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
  }

  if (!logs || logs.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>
  }

  // Get the most recent email status
  const latestLog = logs[0]
  const config = statusConfig[latestLog.status as EmailStatus]
  const Icon = config?.icon || Clock

  const providerResponse = latestLog.providerResponse as {
    blockedBySuppression?: boolean
  } | null

  // Count of bounced/failed emails
  const failedCount = logs.filter(
    (l) => l.status === "bounced" || l.status === "failed"
  ).length

  return (
    <div className="flex items-center gap-1.5">
      <div className={`${config?.color || "text-muted-foreground"}`}>
        {providerResponse?.blockedBySuppression ? (
          <Ban className="h-3.5 w-3.5" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </div>
      <span className="text-xs">
        {logs.length}
        {failedCount > 0 && (
          <span className="text-destructive ml-0.5">({failedCount} failed)</span>
        )}
      </span>
    </div>
  )
}
