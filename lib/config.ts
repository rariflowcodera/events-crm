import { NEXT_PUBLIC_APP_URL_ENV, SMTP_FROM_ENV } from "@/env"

import { ConfigurationType } from "@/types/types"

export const configuration: ConfigurationType = {
  site: {
    name: "Events CRM",
    description: "Manage high-profile events with complex guest logistics.",
    shortDescription: "Event management and guest logistics platform.",
    domain: "events-crm.local",
    siteUrl: NEXT_PUBLIC_APP_URL_ENV,
    defaultTheme: "light",
    logo: "https://res.cloudinary.com/dowiygzq3/image/upload/v1734969150/logo_1_zmqhlu.png",
    openGraphImage: "https://app.boringtemplate.com/open-graph.png",
    openGraphTitle: "Events CRM - Manage your events with ease",
    openGraphDescription:
      "A platform for managing high-profile events with complex guest logistics. Handle RSVPs, guest categories, and personalized communications.",
    contactEmail: "support@events-crm.local",
    xHandle: "eventscrm",
    xUrl: "https://x.com/eventscrm",
    githubHandle: "eventscrm",
  },

  smtp: {
    from: SMTP_FROM_ENV,
  },
}
