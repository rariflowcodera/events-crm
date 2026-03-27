import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { db } from "@/server/db/config/database"
import {
  emailPreviewTokens,
  emailMasterTemplates,
  eventDocuments,
  eventForms,
  guestFormTokens,
  workspaces,
} from "@/server/db/schemas"
import { renderStructuredEmail } from "@/lib/email/render-structured"
import {
  defaultMasterTemplate,
  defaultMasterTemplateStructure,
} from "@/lib/email/master-templates/default"

/**
 * Email preview route handler for custom domains
 * Validates that the custom domain matches the event before rendering
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Get custom domain from header (set by middleware)
  const headersList = await headers()
  const customDomain = headersList.get("x-custom-domain")

  if (!customDomain) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invalid Request</title>
        </head>
        <body>
          <p>Invalid request - custom domain not detected.</p>
        </body>
      </html>`,
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    )
  }

  // Fetch the token with all related data
  const tokenRecord = await db.query.emailPreviewTokens.findFirst({
    where: eq(emailPreviewTokens.token, token),
    with: {
      guest: {
        with: {
          category: true,
        },
      },
      template: true,
      event: {
        with: {
          workspace: {
            columns: {
              id: true,
              branding: true,
              logo: true,
            },
          },
        },
      },
    },
  })

  if (!tokenRecord) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Not Found</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .message {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin: 0; }
          </style>
        </head>
        <body>
          <div class="message">
            <h1>Link Not Found</h1>
            <p>This email preview link is invalid or has been removed.</p>
          </div>
        </body>
      </html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html" },
      }
    )
  }

  const { guest, template, event } = tokenRecord

  // Validate custom domain ownership
  // The event must have this custom domain AND it must be verified
  const normalizedCustomDomain = customDomain.toLowerCase()
  const eventCustomDomain = event.customDomain?.toLowerCase()

  if (
    !eventCustomDomain ||
    eventCustomDomain !== normalizedCustomDomain ||
    !event.customDomainVerified
  ) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Access Denied</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .message {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin: 0; }
          </style>
        </head>
        <body>
          <div class="message">
            <h1>Access Denied</h1>
            <p>This email preview is not accessible from this domain.</p>
          </div>
        </body>
      </html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html" },
      }
    )
  }

  // Check if template has structured content
  if (!template.structuredContent) {
    // For legacy HTML templates, return the HTML directly
    const htmlContent =
      template.content?.en?.htmlContent || template.content?.ar?.htmlContent
    if (htmlContent) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Email Preview</title>
          </head>
          <body>${htmlContent}</body>
        </html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Unavailable</title>
        </head>
        <body>
          <p>This email template is not available for preview.</p>
        </body>
      </html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html" },
      }
    )
  }

  // Get workspace branding
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, event.workspaceId),
  })

  // Get event documents
  const documents = await db.query.eventDocuments.findMany({
    where: eq(eventDocuments.eventId, event.id),
  })

  // Extract form IDs from template content for form link variable processing
  const formIdPattern = /\{\{form(?:Link|Url)\.([a-f0-9-]{36})/g
  const templateContent = JSON.stringify(template.structuredContent)
  const formIds: string[] = []
  let match
  while ((match = formIdPattern.exec(templateContent)) !== null) {
    if (!formIds.includes(match[1])) {
      formIds.push(match[1])
    }
  }

  // Get or create form tokens for referenced forms
  let formTokens: Array<{
    form: { id: string; name: { en: string; ar?: string } }
    token: string
  }> = []

  if (formIds.length > 0) {
    // Get forms that are token-mode and published
    const tokenModeForms = await db.query.eventForms.findMany({
      where: and(
        inArray(eventForms.id, formIds),
        eq(eventForms.eventId, event.id),
        eq(eventForms.accessType, "token"),
        eq(eventForms.isPublished, true)
      ),
      columns: { id: true, name: true, expiresAt: true },
    })

    // Get or create tokens for each form
    formTokens = await Promise.all(
      tokenModeForms.map(async (form) => {
        let existingToken = await db.query.guestFormTokens.findFirst({
          where: and(
            eq(guestFormTokens.guestId, guest.id),
            eq(guestFormTokens.formId, form.id)
          ),
        })

        if (!existingToken) {
          const [newToken] = await db
            .insert(guestFormTokens)
            .values({
              guestId: guest.id,
              formId: form.id,
              token: crypto.randomUUID(),
              expiresAt: form.expiresAt,
            })
            .returning()
          existingToken = newToken
        }

        return {
          form: {
            id: form.id,
            name: form.name as { en: string; ar?: string },
          },
          token: existingToken!.token,
        }
      })
    )
  }

  // Resolve master template: template's masterTemplateId → workspace default → built-in default
  let masterTemplate: {
    id: string
    name: string
    htmlTemplate: string
    structure: typeof defaultMasterTemplateStructure | null
  } | null = null

  if (template.masterTemplateId) {
    masterTemplate = await db.query.emailMasterTemplates.findFirst({
      where: eq(emailMasterTemplates.id, template.masterTemplateId),
    }) ?? null
  }
  if (!masterTemplate) {
    masterTemplate = await db.query.emailMasterTemplates.findFirst({
      where: and(
        eq(emailMasterTemplates.workspaceId, event.workspaceId),
        eq(emailMasterTemplates.isDefault, true),
        isNull(emailMasterTemplates.eventId)
      ),
    }) ?? null
  }
  if (!masterTemplate) {
    masterTemplate = {
      id: "built-in",
      name: "Default",
      htmlTemplate: defaultMasterTemplate,
      structure: defaultMasterTemplateStructure,
    }
  }

  // Prepare guest data for rendering
  const guestData = {
    id: guest.id,
    firstName: guest.firstName,
    lastName: guest.lastName,
    displayNameAr: guest.displayNameAr,
    gender: guest.gender,
    title: guest.title,
    salutation: guest.salutation,
    salutationAr: guest.salutationAr,
    email: guest.email,
    position: guest.position,
    entity: guest.entity,
    rsvpToken: guest.rsvpToken,
    serialNumber: guest.serialNumber,
    categoryId: guest.categoryId,
    category: guest.category
      ? { name: guest.category.name, code: guest.category.code }
      : null,
  }

  // Prepare event data for rendering
  const eventData = {
    id: event.id,
    name: event.name,
    nameAr: event.nameAr,
    slug: event.slug,
    venue: event.venue,
    venueAddress: event.venueAddress,
    latitude: event.latitude,
    longitude: event.longitude,
    startDate: event.startDate,
    endDate: event.endDate,
    rsvpDeadline: event.rsvpDeadline,
    customDomain: event.customDomain,
    customDomainVerified: event.customDomainVerified,
    settings: event.settings,
  }

  // Render the email
  const result = renderStructuredEmail({
    template: {
      id: template.id,
      name: template.name,
      structuredContent: template.structuredContent,
      defaultLanguage: template.defaultLanguage,
      fromName: template.fromName,
      fromEmail: template.fromEmail,
      replyTo: template.replyTo,
      showBannerFooter: template.showBannerFooter,
      structureOverrides: template.structureOverrides,
    },
    masterTemplate,
    guest: guestData,
    event: eventData,
    workspaceBranding: workspace?.branding,
    eventBranding: event.branding,
    documents: documents.map((d) => ({
      id: d.id,
      name: d.name,
      url: d.url,
      type: d.type,
      categoryIds: d.categoryIds,
    })),
    formTokens,
  })

  // Return the rendered HTML directly
  return new NextResponse(result.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
