"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Globe, AlertTriangle, CheckCircle, Clock, Info, Copy, ExternalLink } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Icons } from "@/components/global/icons"
import { toast } from "sonner"
import {
  useUpdateEventCustomDomain,
  useVerifyEventCustomDomain,
  useRemoveEventCustomDomain,
} from "@/trpc/hooks/events-hooks"

interface EventCustomDomainCardProps {
  eventId: string
  customDomain: string | null
  customDomainVerified: boolean | null
  customDomainVerificationToken: string | null
}

const domainSchema = z.object({
  customDomain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      "Please enter a valid domain (e.g., rsvp.yourevent.com)"
    ),
})

type DomainFormValues = z.infer<typeof domainSchema>

export function EventCustomDomainCard({
  eventId,
  customDomain,
  customDomainVerified,
  customDomainVerificationToken,
}: EventCustomDomainCardProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      customDomain: customDomain || "",
    },
  })

  const { mutate: updateDomain, isPending: isUpdating } = useUpdateEventCustomDomain()

  const { mutate: verifyDomain, isPending: isVerifying } = useVerifyEventCustomDomain()
  const { mutate: removeDomain, isPending: isRemoving } = useRemoveEventCustomDomain({
    onSuccess: () => {
      setShowRemoveDialog(false)
      form.reset({ customDomain: "" })
    },
  })

  // Get main app domain from environment
  const mainAppDomain =
    typeof window !== "undefined"
      ? new URL(process.env.NEXT_PUBLIC_APP_URL || window.location.origin).host
      : "your-app.sa"

  const onSubmit = (values: DomainFormValues) => {
    updateDomain({
      eventId,
      customDomain: values.customDomain,
    })
  }

  const handleVerify = () => {
    verifyDomain({ eventId })
  }

  const handleRemove = () => {
    removeDomain({ eventId })
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Custom Domain
        </CardTitle>
        <CardDescription>
          Use your own domain for RSVP pages (e.g., rsvp.yourevent.com)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {customDomain ? (
          <div className="space-y-4">
            {/* Current Domain Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium font-mono">{customDomain}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(customDomain, "Domain")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  RSVP URL: https://{customDomain}/rsvp/[token]
                </p>
              </div>
              <Badge
                variant={customDomainVerified ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {customDomainVerified ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    Pending
                  </>
                )}
              </Badge>
            </div>

            {/* Verification Instructions */}
            {!customDomainVerified && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <p className="font-medium">DNS Configuration Required</p>
                  <p className="text-sm">
                    Add the following DNS records to verify domain ownership:
                  </p>

                  {/* DNS Records */}
                  <div className="space-y-3 text-sm">
                    {/* A/CNAME Record */}
                    <div className="bg-muted p-3 rounded font-mono text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>A or CNAME</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span>@ (or subdomain)</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Value:</span>
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[200px]">{mainAppDomain}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(mainAppDomain, "Value")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* TXT Verification Record */}
                    {customDomainVerificationToken && (
                      <div className="bg-muted p-3 rounded font-mono text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span>TXT</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span>_events-verify</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Value:</span>
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[200px]">
                              {customDomainVerificationToken}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() =>
                                copyToClipboard(
                                  customDomainVerificationToken,
                                  "Verification token"
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    DNS changes can take up to 48 hours to propagate.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Verified Success Message */}
            {customDomainVerified && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <p className="text-green-800 dark:text-green-200">
                    Your custom domain is verified and active. Guests can now access RSVP
                    pages at{" "}
                    <a
                      href={`https://${customDomain}/rsvp/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline inline-flex items-center gap-1"
                    >
                      {customDomain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!customDomainVerified && (
                <Button variant="outline" onClick={handleVerify} disabled={isVerifying}>
                  {isVerifying && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Domain
                </Button>
              )}

              <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isRemoving}>
                    {isRemoving && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                    Remove Domain
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Custom Domain?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the custom domain from this event. Guests will no
                      longer be able to access RSVP pages via{" "}
                      <span className="font-mono font-medium">{customDomain}</span>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemove}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove Domain
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="rsvp.yourevent.com"
                        disabled={isUpdating}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the domain you want to use for RSVP pages. Do not include
                      https:// or trailing slashes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                Add Custom Domain
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
