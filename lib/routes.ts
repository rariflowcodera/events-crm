import { Metadata } from "next"
import { redirect, RedirectType } from "next/navigation"

import { configuration } from "@/lib/config"
import { documentTitle, placeholderImageUrl } from "@/lib/utils"
import { Icons } from "@/components/global/icons"

// Define the route names as a union type
export type RouteName =
  | "home"
  | "sign-in"
  | "sign-out"
  | "join"
  | "invite"
  | "callback"
  | "dashboard"
  | "guests"
  | "events"
  | "event-detail"
  | "event-create"
  | "guest-new"
  | "guest-detail"
  | "guest-import"
  | "category-new"
  | "category-detail"
  | "template-new"
  | "template-detail"
  | "form-detail"
  | "form-responses"
  | "analytics"
  | "docs"
  | "docs-page"
  | "settings"
  | "settings-profile"
  | "settings-members"
  | "settings-workspace"
  | "settings-branding"
  | "settings-personalization"
  | "settings-navigation"
  | "error"
  | "terms"
  | "privacy"
  | "license"
  | "settings-workspaces"

export interface RouteConfigType {
  path: string
  disabled?: boolean
  name: RouteName

  metadata: Metadata

  metadataExtra: {
    image?: string
    icon?: keyof typeof Icons
    name: string
  }
}
/**
 * The routes for the application
 */
export const ROUTES: Record<RouteName, RouteConfigType> = {
  home: {
    name: "home",
    path: "/",
    metadata: {
      title: documentTitle("Home"),
      description: "Home page",
    },
    metadataExtra: {
      name: "Home",
    },
  },

  "sign-out": {
    name: "sign-out",
    path: "/sign-out",
    metadata: {
      title: documentTitle("Sign out"),
      description: "Sign out of your account",
    },
    metadataExtra: {
      name: "Sign out",
    },
  },

  "sign-in": {
    name: "sign-in",
    path: "/sign-in",
    metadata: {
      title: documentTitle("Sign in"),
      description: "Sign in to your account",
      openGraph: {
        title: documentTitle("Sign in"),
        description: "Sign in to your account",
      },
      twitter: {
        title: documentTitle("Sign in"),
        description: "Sign in to your account",
      },
    },
    metadataExtra: {
      name: "Sign in",
      icon: "user",
      image: placeholderImageUrl({}),
    },
  },

  join: {
    name: "join",
    path: "/join",
    metadata: {
      title: documentTitle("Join"),
      description: "Join or create a workspace",
      openGraph: {
        title: documentTitle("Join"),
        description: "Join or create a workspace",
      },
      twitter: {
        title: documentTitle("Join"),
        description: "Join or create a workspace",
      },
    },
    metadataExtra: {
      name: "Join",
      image: placeholderImageUrl({}),
      icon: "plus",
    },
  },

  invite: {
    name: "invite",
    path: "/invite/:token",
    metadata: {
      title: documentTitle("Invitation"),
      description: "You have been invited",
    },
    metadataExtra: {
      name: "Invite",
      image: placeholderImageUrl({}),
    },
  },

  analytics: {
    name: "analytics",
    path: "/:slug/analytics",
    metadata: {
      title: documentTitle("Analytics"),
      description: "Analytics page",
    },
    metadataExtra: {
      name: "Analytics",
      image: placeholderImageUrl({}),
      icon: "chart",
    },
  },

  docs: {
    name: "docs",
    path: "/:slug/docs",
    metadata: {
      title: documentTitle("Documentation"),
      description: "Help and documentation",
    },
    metadataExtra: {
      name: "User Guide",
      image: placeholderImageUrl({}),
      icon: "book",
    },
  },

  "docs-page": {
    name: "docs-page",
    path: "/:slug/docs/:docSlug*",
    metadata: {
      title: documentTitle("Documentation"),
      description: "Help and documentation",
    },
    metadataExtra: {
      name: "Doc Page",
      image: placeholderImageUrl({}),
      icon: "book",
    },
  },

  callback: {
    name: "callback",
    path: "/callback",
    metadata: {
      title: documentTitle("Dashboard"),
      description: `Dashboard for your ${configuration.site.name} account.`,
      openGraph: {
        title: documentTitle("Callback"),
        description: "Callback page for redirecting users",
      },
      twitter: {
        title: documentTitle("Callback"),
        description: "Callback page for redirecting users",
      },
    },
    metadataExtra: {
      name: "Dashboard",
      image: placeholderImageUrl({}),
      icon: "chart",
    },
  },
  dashboard: {
    name: "dashboard",
    path: "/:slug/dashboard",
    metadata: {
      title: documentTitle("Dashboard"),
      description: "Dashboard page",
      openGraph: {
        title: documentTitle("Dashboard"),
        description: "Dashboard page",
      },
      twitter: {
        title: documentTitle("Dashboard"),
        description: "Dashboard page",
      },
    },
    metadataExtra: {
      name: "Dashboard",
      image: placeholderImageUrl({}),
      icon: "dashboard",
    },
  },
  guests: {
    name: "guests",
    path: "/:slug/guests",
    metadata: {
      title: documentTitle("Guest Directory"),
      description: "Workspace-wide guest directory",
    },
    metadataExtra: {
      name: "Guests",
      image: placeholderImageUrl({}),
      icon: "users",
    },
  },
  events: {
    name: "events",
    path: "/:slug/events",
    metadata: {
      title: documentTitle("Events"),
      description: "Manage your events",
    },
    metadataExtra: {
      name: "Events",
      image: placeholderImageUrl({}),
      icon: "calendar",
    },
  },
  "event-detail": {
    name: "event-detail",
    path: "/:slug/events/:eventSlug",
    metadata: {
      title: documentTitle("Event"),
      description: "Event details",
    },
    metadataExtra: {
      name: "Event",
      image: placeholderImageUrl({}),
      icon: "calendar",
    },
  },
  "event-create": {
    name: "event-create",
    path: "/:slug/events/create",
    metadata: {
      title: documentTitle("Create Event"),
      description: "Create a new event",
    },
    metadataExtra: {
      name: "Create Event",
      image: placeholderImageUrl({}),
      icon: "plus",
    },
  },
  "guest-new": {
    name: "guest-new",
    path: "/:slug/events/:eventSlug/guests/new",
    metadata: {
      title: documentTitle("Add Guest"),
      description: "Add a new guest",
    },
    metadataExtra: {
      name: "Add Guest",
      image: placeholderImageUrl({}),
      icon: "plus",
    },
  },
  "guest-detail": {
    name: "guest-detail",
    path: "/:slug/events/:eventSlug/guests/:guestId",
    metadata: {
      title: documentTitle("Guest"),
      description: "Guest details",
    },
    metadataExtra: {
      name: "Guest",
      image: placeholderImageUrl({}),
      icon: "user",
    },
  },
  "guest-import": {
    name: "guest-import",
    path: "/:slug/events/:eventSlug/guests/import",
    metadata: {
      title: documentTitle("Import Guests"),
      description: "Import guests from Excel",
    },
    metadataExtra: {
      name: "Import Guests",
      image: placeholderImageUrl({}),
      icon: "upload",
    },
  },
  "category-new": {
    name: "category-new",
    path: "/:slug/events/:eventSlug/categories/new",
    metadata: {
      title: documentTitle("Add Category"),
      description: "Add a new guest category",
    },
    metadataExtra: {
      name: "Add Category",
      image: placeholderImageUrl({}),
      icon: "plus",
    },
  },
  "category-detail": {
    name: "category-detail",
    path: "/:slug/events/:eventSlug/categories/:categoryId",
    metadata: {
      title: documentTitle("Category"),
      description: "Edit guest category",
    },
    metadataExtra: {
      name: "Category",
      image: placeholderImageUrl({}),
      icon: "layers",
    },
  },
  "template-new": {
    name: "template-new",
    path: "/:slug/events/:eventSlug/templates/new",
    metadata: {
      title: documentTitle("Create Template"),
      description: "Create email template",
    },
    metadataExtra: {
      name: "Create Template",
      image: placeholderImageUrl({}),
      icon: "plus",
    },
  },
  "template-detail": {
    name: "template-detail",
    path: "/:slug/events/:eventSlug/templates/:templateId",
    metadata: {
      title: documentTitle("Edit Template"),
      description: "Edit email template",
    },
    metadataExtra: {
      name: "Edit Template",
      image: placeholderImageUrl({}),
      icon: "mail",
    },
  },
  "form-detail": {
    name: "form-detail",
    path: "/:slug/events/:eventSlug/forms/:formSlug",
    metadata: {
      title: documentTitle("Edit Form"),
      description: "Edit form",
    },
    metadataExtra: {
      name: "Edit Form",
      image: placeholderImageUrl({}),
      icon: "formInput",
    },
  },
  "form-responses": {
    name: "form-responses",
    path: "/:slug/events/:eventSlug/forms/:formSlug/responses",
    metadata: {
      title: documentTitle("Form Responses"),
      description: "View form responses",
    },
    metadataExtra: {
      name: "Form Responses",
      image: placeholderImageUrl({}),
      icon: "list",
    },
  },
  settings: {
    name: "settings",
    path: "/:slug/settings",
    metadata: {
      title: documentTitle("Settings"),
      description: "Settings page",
    },
    metadataExtra: {
      name: "Settings",
      image: placeholderImageUrl({}),
      icon: "settings",
    },
  },

  "settings-profile": {
    name: "settings-profile",
    path: "/:slug/settings/profile",
    metadata: {
      title: documentTitle("Profile Settings"),
      description: "Profile settings page",
    },
    metadataExtra: {
      name: "Profile",
      image: placeholderImageUrl({}),
      icon: "settings",
    },
  },

  "settings-members": {
    name: "settings-members",
    path: "/:slug/settings/members",
    metadata: {
      title: documentTitle("Members settings"),
      description: "Members settings",
    },
    metadataExtra: {
      name: "Members",
      image: placeholderImageUrl({}),
      icon: "users",
    },
  },

  "settings-workspace": {
    name: "settings-workspace",
    path: "/:slug/settings/workspace",
    metadata: {
      title: documentTitle("Workspace"),
      description: "General workspace",
    },
    metadataExtra: {
      name: "Workspace",
      image: placeholderImageUrl({}),
      icon: "workspace",
    },
  },

  "settings-branding": {
    name: "settings-branding",
    path: "/:slug/settings/branding",
    metadata: {
      title: documentTitle("Branding"),
      description: "Customize your workspace branding",
    },
    metadataExtra: {
      name: "Branding",
      image: placeholderImageUrl({}),
      icon: "brush",
    },
  },

  "settings-personalization": {
    name: "settings-personalization",
    path: "/:slug/settings/personalization",
    metadata: {
      title: documentTitle("Personalization"),
      description: "Personalization settings",
    },
    metadataExtra: {
      name: "Personalization",
      image: placeholderImageUrl({}),
      icon: "brush",
    },
  },

  "settings-navigation": {
    name: "settings-navigation",
    path: "/:slug/settings/navigation",
    metadata: {
      title: documentTitle("Navigation"),
      description: "Configure navigation visibility by role",
    },
    metadataExtra: {
      name: "Navigation",
      image: placeholderImageUrl({}),
      icon: "sidebar",
    },
  },

  "settings-workspaces": {
    name: "settings-workspaces",
    path: "/:slug/settings/workspaces",
    metadata: {
      title: documentTitle("Workspaces"),
      description: "Workspaces page",
    },
    metadataExtra: {
      name: "Workspaces",
      image: placeholderImageUrl({}),
      icon: "briefcase",
    },
  },

  error: {
    name: "error",
    path: "/error",
    metadata: {
      title: documentTitle("Error"),
      description: "Server error",
    },
    metadataExtra: {
      name: "Error",
      image: placeholderImageUrl({}),
    },
  },

  terms: {
    name: "terms",
    path: "/terms",
    metadata: {
      title: documentTitle("Terms"),
      description: "Terms and conditions",
    },
    metadataExtra: {
      name: "Terms",
      image: placeholderImageUrl({}),
    },
  },

  privacy: {
    name: "privacy",
    path: "/privacy",
    metadata: {
      title: documentTitle("Privacy"),
      description: "Privacy policy",
    },
    metadataExtra: {
      name: "Privacy",
      image: placeholderImageUrl({}),
    },
  },

  license: {
    name: "license",
    path: "/license",
    metadata: {
      title: documentTitle("License"),
      description: "License",
    },
    metadataExtra: {
      name: "License",
      image: placeholderImageUrl({}),
    },
  },
} as const

// Add these types at the top of your routes file
type RouteParams = {
  home: never
  "sign-in": never
  "sign-out": never
  join: never
  invite: { token: string }
  callback: never
  dashboard: { slug: string }
  guests: { slug: string }
  events: { slug: string }
  "event-detail": { slug: string; eventSlug: string }
  "event-create": { slug: string }
  "guest-new": { slug: string; eventSlug: string }
  "guest-detail": { slug: string; eventSlug: string; guestId: string }
  "guest-import": { slug: string; eventSlug: string }
  "category-new": { slug: string; eventSlug: string }
  "category-detail": { slug: string; eventSlug: string; categoryId: string }
  "template-new": { slug: string; eventSlug: string }
  "template-detail": { slug: string; eventSlug: string; templateId: string }
  "form-detail": { slug: string; eventSlug: string; formSlug: string }
  "form-responses": { slug: string; eventSlug: string; formSlug: string }
  analytics: { slug: string }
  docs: { slug: string }
  "docs-page": { slug: string; docSlug: string[] }
  settings: { slug: string }
  "settings-profile": { slug: string }
  "settings-members": { slug: string }
  "settings-workspace": { slug: string }
  "settings-branding": { slug: string }
  "settings-personalization": { slug: string }
  "settings-navigation": { slug: string }
  "settings-workspaces": { slug: string }
  error: never
  terms: never
  privacy: never
  license: never
}

/**
 * Create a route
 * @param route - The route to create
 * @param params - The parameters for the route
 * @returns
 */
export function createRoute<T extends RouteName>(route: T, params?: RouteParams[T]) {
  let path = ROUTES[route].path

  if (params) {
    if ("slug" in params) {
      path = path.replace(":slug", params.slug as string)
    }
    if ("token" in params) {
      path = path.replace(":token", params.token as string)
    }
    if ("eventSlug" in params) {
      path = path.replace(":eventSlug", params.eventSlug as string)
    }
    if ("guestId" in params) {
      path = path.replace(":guestId", params.guestId as string)
    }
    if ("categoryId" in params) {
      path = path.replace(":categoryId", params.categoryId as string)
    }
    if ("templateId" in params) {
      path = path.replace(":templateId", params.templateId as string)
    }
    if ("formSlug" in params) {
      path = path.replace(":formSlug", params.formSlug as string)
    }
  }

  return { href: path.startsWith("/") ? path : `/${path}` }
}

/**
 * Redirect to a route
 * @param route - The route to redirect to
 * @param params - The parameters for the route
 * @param type - The type of redirect
 * @returns
 */

export function redirectToRoute<T extends RouteName>(
  route: T,
  params?: RouteParams[T],
  type: RedirectType = RedirectType.replace
) {
  return redirect(createRoute(route, params).href, type)
}

// Add a helper function to get metadata
// export function getRouteMetadata<T extends RouteName>(
//   route: T,
//   params?: RouteParams[T] & { [key: string]: any }
// ) {
//   return ROUTES[route].metadata
// }
