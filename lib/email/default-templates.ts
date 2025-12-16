import { BilingualEmailContent } from "@/server/db/schemas/email-template"

export type DefaultEmailTemplate = {
  name: string
  type:
    | "invitation"
    | "reminder"
    | "confirmation"
    | "declined_acknowledgment"
    | "maybe_acknowledgment"
  content: BilingualEmailContent
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    name: "Default Invitation",
    type: "invitation",
    content: {
      en: {
        subject: "You're Invited to {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>You are cordially invited to attend {{event.name}}.</p>
<p><strong>Event Details:</strong></p>
<ul>
  <li>Date: {{event.startDate}}</li>
  <li>Venue: {{event.venue}}</li>
  <li>Address: {{event.venueAddress}}</li>
</ul>
<p>Please confirm your attendance by {{event.rsvpDeadline}}.</p>
<p><a href="{{rsvp.link}}">Respond to Invitation</a></p>`,
      },
      ar: {
        subject: "دعوة لحضور {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>يسعدنا دعوتكم لحضور {{event.name}}.</p>
<p><strong>تفاصيل الفعالية:</strong></p>
<ul>
  <li>التاريخ: {{event.startDate}}</li>
  <li>المكان: {{event.venue}}</li>
  <li>العنوان: {{event.venueAddress}}</li>
</ul>
<p>يرجى تأكيد حضوركم قبل {{event.rsvpDeadline}}.</p>
<p><a href="{{rsvp.link}}">الرد على الدعوة</a></p>`,
      },
    },
  },
  {
    name: "Default Reminder",
    type: "reminder",
    content: {
      en: {
        subject: "Reminder: Please respond to {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>This is a friendly reminder to respond to your invitation for {{event.name}}.</p>
<p>The RSVP deadline is {{event.rsvpDeadline}}.</p>
<p><a href="{{rsvp.link}}">Respond Now</a></p>`,
      },
      ar: {
        subject: "تذكير: يرجى الرد على دعوة {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>هذا تذكير ودي للرد على دعوتكم لحضور {{event.name}}.</p>
<p>آخر موعد للرد هو {{event.rsvpDeadline}}.</p>
<p><a href="{{rsvp.link}}">الرد الآن</a></p>`,
      },
    },
  },
  {
    name: "Confirmation Acknowledgement",
    type: "confirmation",
    content: {
      en: {
        subject: "Thank you for confirming - {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>Thank you for confirming your attendance at {{event.name}}.</p>
<p><strong>Event Details:</strong></p>
<ul>
  <li>Date: {{event.startDate}}</li>
  <li>Venue: {{event.venue}}</li>
</ul>
<p>We look forward to seeing you!</p>
<p>If your plans change, you can update your response: <a href="{{rsvp.link}}">Update Response</a></p>`,
      },
      ar: {
        subject: "شكراً لتأكيد حضوركم - {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>شكراً لتأكيد حضوركم في {{event.name}}.</p>
<p><strong>تفاصيل الفعالية:</strong></p>
<ul>
  <li>التاريخ: {{event.startDate}}</li>
  <li>المكان: {{event.venue}}</li>
</ul>
<p>نتطلع لرؤيتكم!</p>
<p>إذا تغيرت خططكم، يمكنكم تحديث ردكم: <a href="{{rsvp.link}}">تحديث الرد</a></p>`,
      },
    },
  },
  {
    name: "Decline Acknowledgement",
    type: "declined_acknowledgment",
    content: {
      en: {
        subject: "We've received your response - {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>We've received your response and understand you won't be able to attend {{event.name}}.</p>
<p>If your plans change, you can update your response:</p>
<p><a href="{{rsvp.link}}">Update My Response</a></p>
<p>Thank you for letting us know.</p>`,
      },
      ar: {
        subject: "تم استلام ردكم - {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>تم استلام ردكم ونتفهم عدم قدرتكم على حضور {{event.name}}.</p>
<p>إذا تغيرت خططكم، يمكنكم تحديث ردكم:</p>
<p><a href="{{rsvp.link}}">تحديث الرد</a></p>
<p>شكراً لإعلامنا.</p>`,
      },
    },
  },
  {
    name: "Maybe Acknowledgement",
    type: "maybe_acknowledgment",
    content: {
      en: {
        subject: "We've received your response - {{event.name}}",
        htmlContent: `<p>Dear {{guest.salutation}} {{guest.fullName}},</p>
<p>Thank you for your response regarding {{event.name}}. We understand you're not yet certain about your availability.</p>
<p>Please update your response when you know for sure:</p>
<p><a href="{{rsvp.link}}">Update My Response</a></p>
<p>The RSVP deadline is {{event.rsvpDeadline}}.</p>`,
      },
      ar: {
        subject: "تم استلام ردكم - {{event.name}}",
        htmlContent: `<p>{{guest.salutation}} {{guest.fullName}} العزيز/ة،</p>
<p>شكراً لردكم بخصوص {{event.name}}. نتفهم أنكم غير متأكدين من توفركم بعد.</p>
<p>يرجى تحديث ردكم عندما تتأكدون:</p>
<p><a href="{{rsvp.link}}">تحديث الرد</a></p>
<p>آخر موعد للرد هو {{event.rsvpDeadline}}.</p>`,
      },
    },
  },
]
