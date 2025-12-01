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
  | "events"
  | "event-detail"
  | "analytics"
  | "settings"
  | "settings-profile"
  | "settings-members"
  | "settings-workspace"
  | "settings-branding"
  | "settings-personalization"
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
  events: { slug: string }
  "event-detail": { slug: string; eventSlug: string }
  analytics: { slug: string }
  settings: { slug: string }
  "settings-profile": { slug: string }
  "settings-members": { slug: string }
  "settings-workspace": { slug: string }
  "settings-branding": { slug: string }
  "settings-personalization": { slug: string }
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
