"use client"

import { useState } from "react"
import { Monitor, Smartphone, RefreshCw, ExternalLink, Copy, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface MasterTemplatePreviewProps {
  html?: string
  subject?: string
  text?: string
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}

type ViewMode = "desktop" | "mobile"
type ContentMode = "html" | "text"

// ============================================================================
// Component
// ============================================================================

export function MasterTemplatePreview({
  html,
  subject,
  text,
  isLoading,
  onRefresh,
  className,
}: MasterTemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop")
  const [contentMode, setContentMode] = useState<ContentMode>("html")
  const [copied, setCopied] = useState(false)

  const handleCopyHtml = async () => {
    if (html) {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenInNewTab = () => {
    if (html) {
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    }
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Preview</CardTitle>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-md border bg-muted p-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={viewMode === "desktop" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewMode("desktop")}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Desktop view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={viewMode === "mobile" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewMode("mobile")}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mobile view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {onRefresh && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={onRefresh}
                        disabled={isLoading}
                      >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh preview</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleCopyHtml}
                      disabled={!html}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy HTML</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleOpenInNewTab}
                      disabled={!html}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open in new tab</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Subject line */}
        {subject && (
          <div className="mt-2 px-3 py-2 rounded-md bg-muted/50 text-sm">
            <span className="text-muted-foreground">Subject:</span>{" "}
            <span className="font-medium">{subject}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <Tabs value={contentMode} onValueChange={(v) => setContentMode(v as ContentMode)} className="h-full flex flex-col">
          <div className="px-4 pt-3 border-b">
            <TabsList className="h-8">
              <TabsTrigger value="html" className="text-xs h-7">
                HTML Preview
              </TabsTrigger>
              <TabsTrigger value="text" className="text-xs h-7">
                Plain Text
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="html" className="flex-1 m-0 p-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-32 mx-auto" />
              </div>
            ) : html ? (
              <div
                className={cn(
                  "mx-auto bg-white rounded-lg shadow-sm border overflow-hidden transition-all duration-300",
                  viewMode === "desktop" ? "max-w-[640px]" : "max-w-[375px]"
                )}
              >
                <ScrollArea className="h-[500px]">
                  <iframe
                    srcDoc={html}
                    title="Email Preview"
                    className="w-full h-full min-h-[500px] border-0"
                    sandbox="allow-same-origin"
                  />
                </ScrollArea>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No preview available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fill in the template content to see a preview
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="flex-1 m-0 p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : text ? (
              <ScrollArea className="h-[500px]">
                <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                  {text}
                </pre>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">No plain text version available</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Compact Preview (for inline use)
// ============================================================================

interface CompactPreviewProps {
  html?: string
  isLoading?: boolean
  className?: string
}

export function CompactEmailPreview({ html, isLoading, className }: CompactPreviewProps) {
  if (isLoading) {
    return (
      <div className={cn("rounded-lg border bg-muted/50 p-4", className)}>
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  if (!html) {
    return (
      <div className={cn("rounded-lg border bg-muted/50 p-4 text-center text-muted-foreground", className)}>
        <p className="text-sm">Preview will appear here</p>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border overflow-hidden bg-white", className)}>
      <iframe
        srcDoc={html}
        title="Email Preview"
        className="w-full h-[300px] border-0 pointer-events-none"
        sandbox="allow-same-origin"
      />
    </div>
  )
}
