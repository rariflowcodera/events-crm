"use client"

import React from "react"
import { usePathname } from "next/navigation"

import { capitalizeFirstLetter } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function BreadCrumbList() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => (
          <React.Fragment key={segment + index}>
            <BreadcrumbItem>
              {index === segments.length - 1 ? (
                <BreadcrumbPage className="max-w-[30ch] truncate">
                  {capitalizeFirstLetter(segment)}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={`/${segments.slice(0, index + 1).join("/")}`}>
                  {capitalizeFirstLetter(segment)}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < segments.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
