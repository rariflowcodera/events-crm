import { BilingualStructuredContent } from "@/server/db/schemas/email-template"

export type DefaultEmailTemplate = {
  name: string
  type:
    | "invitation"
    | "reminder"
    | "confirmation"
    | "declined_acknowledgment"
    | "maybe_acknowledgment"
  structuredContent: BilingualStructuredContent
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    name: "Default Invitation",
    type: "invitation",
    structuredContent: {
      en: {
        subject: "You're Invited to {{event.name}}",
        greeting: "Dear {{guest.salutation}} {{guest.fullName}},",
        heading: "You're Cordially Invited",
        subheading: "{{event.name}}",
        bodyParagraphs: [
          "You are cordially invited to attend {{event.name}}.",
          "Date: {{event.startDate}}\nVenue: {{event.venue}}\nAddress: {{event.venueAddress}}",
          "Please confirm your attendance by {{event.rsvpDeadline}}.",
        ],
        cta: {
          text: "Respond to Invitation",
          url: "{{rsvp.link}}",
        },
      },
      ar: {
        subject: "دعوة لحضور {{event.name}}",
        greeting: "{{guest.salutation}} {{guest.fullName}} العزيز/ة،",
        heading: "دعوة لحضور",
        subheading: "{{event.name}}",
        bodyParagraphs: [
          "يسعدنا دعوتكم لحضور {{event.name}}.",
          "التاريخ: {{event.startDate}}\nالمكان: {{event.venue}}\nالعنوان: {{event.venueAddress}}",
          "يرجى تأكيد حضوركم قبل {{event.rsvpDeadline}}.",
        ],
        cta: {
          text: "الرد على الدعوة",
          url: "{{rsvp.link}}",
        },
      },
    },
  },
  {
    name: "Default Reminder",
    type: "reminder",
    structuredContent: {
      en: {
        subject: "Reminder: Please respond to {{event.name}}",
        greeting: "Dear {{guest.salutation}} {{guest.fullName}},",
        heading: "Friendly Reminder",
        bodyParagraphs: [
          "This is a friendly reminder to respond to your invitation for {{event.name}}.",
          "The RSVP deadline is {{event.rsvpDeadline}}.",
        ],
        cta: {
          text: "Respond Now",
          url: "{{rsvp.link}}",
        },
      },
      ar: {
        subject: "تذكير: يرجى الرد على دعوة {{event.name}}",
        greeting: "{{guest.salutation}} {{guest.fullName}} العزيز/ة،",
        heading: "تذكير ودي",
        bodyParagraphs: [
          "هذا تذكير ودي للرد على دعوتكم لحضور {{event.name}}.",
          "آخر موعد للرد هو {{event.rsvpDeadline}}.",
        ],
        cta: {
          text: "الرد الآن",
          url: "{{rsvp.link}}",
        },
      },
    },
  },
  {
    name: "Confirmation Acknowledgement",
    type: "confirmation",
    structuredContent: {
      en: {
        subject: "Thank you for confirming - {{event.name}}",
        greeting: "Dear {{guest.salutation}} {{guest.fullName}},",
        heading: "Thank You for Confirming",
        bodyParagraphs: [
          "Thank you for confirming your attendance at {{event.name}}.",
          "Date: {{event.startDate}}\nVenue: {{event.venue}}",
          "If your plans change, you can update your response using the link below.",
        ],
        cta: {
          text: "Update Response",
          url: "{{rsvp.link}}",
        },
        postCtaText: "We look forward to seeing you!",
      },
      ar: {
        subject: "شكراً لتأكيد حضوركم - {{event.name}}",
        greeting: "{{guest.salutation}} {{guest.fullName}} العزيز/ة،",
        heading: "شكراً لتأكيد حضوركم",
        bodyParagraphs: [
          "شكراً لتأكيد حضوركم في {{event.name}}.",
          "التاريخ: {{event.startDate}}\nالمكان: {{event.venue}}",
          "إذا تغيرت خططكم، يمكنكم تحديث ردكم باستخدام الرابط أدناه.",
        ],
        cta: {
          text: "تحديث الرد",
          url: "{{rsvp.link}}",
        },
        postCtaText: "نتطلع لرؤيتكم!",
      },
    },
  },
  {
    name: "Decline Acknowledgement",
    type: "declined_acknowledgment",
    structuredContent: {
      en: {
        subject: "We've received your response - {{event.name}}",
        greeting: "Dear {{guest.salutation}} {{guest.fullName}},",
        heading: "Response Received",
        bodyParagraphs: [
          "We've received your response and understand you won't be able to attend {{event.name}}.",
          "If your plans change, you can update your response using the link below.",
        ],
        cta: {
          text: "Update My Response",
          url: "{{rsvp.link}}",
        },
        postCtaText: "Thank you for letting us know.",
      },
      ar: {
        subject: "تم استلام ردكم - {{event.name}}",
        greeting: "{{guest.salutation}} {{guest.fullName}} العزيز/ة،",
        heading: "تم استلام ردكم",
        bodyParagraphs: [
          "تم استلام ردكم ونتفهم عدم قدرتكم على حضور {{event.name}}.",
          "إذا تغيرت خططكم، يمكنكم تحديث ردكم باستخدام الرابط أدناه.",
        ],
        cta: {
          text: "تحديث الرد",
          url: "{{rsvp.link}}",
        },
        postCtaText: "شكراً لإعلامنا.",
      },
    },
  },
  {
    name: "Maybe Acknowledgement",
    type: "maybe_acknowledgment",
    structuredContent: {
      en: {
        subject: "We've received your response - {{event.name}}",
        greeting: "Dear {{guest.salutation}} {{guest.fullName}},",
        heading: "Response Received",
        bodyParagraphs: [
          "Thank you for your response regarding {{event.name}}. We understand you're not yet certain about your availability.",
          "Please update your response when you know for sure. The RSVP deadline is {{event.rsvpDeadline}}.",
        ],
        cta: {
          text: "Update My Response",
          url: "{{rsvp.link}}",
        },
      },
      ar: {
        subject: "تم استلام ردكم - {{event.name}}",
        greeting: "{{guest.salutation}} {{guest.fullName}} العزيز/ة،",
        heading: "تم استلام ردكم",
        bodyParagraphs: [
          "شكراً لردكم بخصوص {{event.name}}. نتفهم أنكم غير متأكدين من توفركم بعد.",
          "يرجى تحديث ردكم عندما تتأكدون. آخر موعد للرد هو {{event.rsvpDeadline}}.",
        ],
        cta: {
          text: "تحديث الرد",
          url: "{{rsvp.link}}",
        },
      },
    },
  },
]
