"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertTriangle,
  RefreshCw,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"
import {
  useEmailDeliveryStats,
  useRecentBounces,
  useSuppressionStats,
  useTriggerSuppressionSync,
} from "@/trpc/hooks/email-delivery-hooks"
import { formatDistanceToNow } from "date-fns"
import { SuppressionListDialog } from "./suppression-list-dialog"

interface EmailDeliveryDashboardProps {
  eventId: string
}

export function EmailDeliveryDashboard({ eventId }: EmailDeliveryDashboardProps) {
  const { data: stats, isLoading: statsLoading } = useEmailDeliveryStats(eventId)
  const { data: bounces, isLoading: bouncesLoading } = useRecentBounces(
    eventId,
    5
  )
  const { data: suppressionStats } = useSuppressionStats()
  const triggerSync = useTriggerSuppressionSync()

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Loading delivery stats...
        </span>
      </div>
    )
  }

  const bounceRate = parseFloat(stats?.bounceRate || "0")
  const highBounceRate = bounceRate > 2

  return (
    <div className="space-y-6">
      {/* Bounce Rate Warning */}
      {highBounceRate && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Bounce Rate</AlertTitle>
          <AlertDescription>
            Your bounce rate is {stats?.bounceRate}%. Oracle recommends keeping
            it below 2% to maintain good sender reputation.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered to SMTP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounced</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.bounced || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.bounceRate}% bounce rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats?.failed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.failureRate}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.pending || 0) + (stats?.queued || 0)}
            </div>
            <p className="text-xs text-muted-foreground">In queue or sending</p>
          </CardContent>
        </Card>
      </div>

      {/* Suppression List Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suppression List</CardTitle>
              <CardDescription>
                Addresses that have bounced or complained
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync.mutate()}
              disabled={triggerSync.isPending}
            >
              {triggerSync.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-2xl font-bold">
                  {suppressionStats?.total || 0}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  suppressed addresses
                </span>
              </div>
              {suppressionStats?.lastSyncAt && (
                <Badge variant="secondary">
                  Synced{" "}
                  {formatDistanceToNow(new Date(suppressionStats.lastSyncAt), {
                    addSuffix: true,
                  })}
                </Badge>
              )}
            </div>
            <SuppressionListDialog />
          </div>

          {/* Breakdown by reason */}
          {suppressionStats?.byCause && suppressionStats.byCause.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {suppressionStats.byCause.map((item) => (
                <Badge key={item.reason} variant="outline">
                  {item.reason}: {item.count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Bounces */}
      {bounces && bounces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recent Bounces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bounces.map((bounce) => {
                const providerResponse = bounce.providerResponse as {
                  reason?: string
                } | null

                return (
                  <div
                    key={bounce.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {bounce.guest?.firstName} {bounce.guest?.lastName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {bounce.toEmail}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Badge variant="destructive">
                        {providerResponse?.reason || "BOUNCED"}
                      </Badge>
                      {bounce.bouncedAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(bounce.bouncedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for bounces */}
      {bounces && bounces.length === 0 && stats && stats.bounced === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <p className="mt-2 text-sm text-muted-foreground">
              No bounced emails - great job maintaining your email list!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
