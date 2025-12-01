"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

type ErrorClientProps = {
  type?: "whole-page" | "section"
}

export function ErrorClient({ type = "whole-page" }: ErrorClientProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const statusCode = searchParams.get("status")

  return (
    <div
      className={cn("bg-background flex min-h-screen items-center justify-center p-4", {
        "bg-transparent": type === "section",
      })}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto rounded-full bg-red-100 p-3">
            <AlertTriangle
              className={cn("size-8 text-red-600", {
                "size-6": type === "section",
              })}
            />
          </div>
          <h1
            className={cn("text-3xl font-bold tracking-tighter", {
              "text-lg": type === "section",
            })}
          >
            Server Error
          </h1>
          <p
            className={cn("text-muted-foreground", {
              "text-sm": type === "section",
            })}
          >
            We apologize, but something went wrong on our servers. This is not your fault, and our
            team has been notified.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <div className="bg-secondary rounded-lg p-4 text-sm">
            <p className="font-mono">Error Code: {statusCode}</p>
            <p className="text-muted-foreground">{error ? error : "Internal Server Error"}</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col justify-center gap-y-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto">
            <RefreshCw />
            Try Again
          </Button>
          {type === "whole-page" && (
            <Link
              prefetch
              href="/"
              className={cn(buttonVariants({ className: "w-full sm:w-auto" }))}
            >
              <Home />
              Return Home
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
