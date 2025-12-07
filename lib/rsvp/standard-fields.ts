/**
 * Standard RSVP Form Fields Library
 *
 * Pre-defined field definitions with bilingual labels for all standard fields
 * that map to materialized columns in the rsvp_responses table.
 */

import type { StandardFieldDefinition, SectionId } from "./types"

// ============================================================================
// Standard Field Definitions
// ============================================================================

export const STANDARD_FIELDS: Record<string, StandardFieldDefinition> = {
  // === PERSONAL INFO SECTION ===
  preferred_language: {
    fieldKey: "preferred_language",
    section: "personal_info",
    type: "select",
    label: {
      en: "Preferred Language",
      ar: "اللغة المفضلة",
    },
    options: [
      { value: "en", label: { en: "English", ar: "الإنجليزية" } },
      { value: "ar", label: { en: "Arabic", ar: "العربية" } },
    ],
    materializedColumn: "preferredLanguage",
  },

  // === LOGISTICS SECTION ===
  arrival_date: {
    fieldKey: "arrival_date",
    section: "logistics",
    type: "date",
    label: {
      en: "Arrival Date",
      ar: "تاريخ الوصول",
    },
    materializedColumn: "arrivalDate",
  },

  departure_date: {
    fieldKey: "departure_date",
    section: "logistics",
    type: "date",
    label: {
      en: "Departure Date",
      ar: "تاريخ المغادرة",
    },
    materializedColumn: "departureDate",
  },

  arrival_flight: {
    fieldKey: "arrival_flight",
    section: "logistics",
    type: "text",
    label: {
      en: "Arrival Flight Number",
      ar: "رقم رحلة الوصول",
    },
    placeholder: {
      en: "e.g., SV123",
      ar: "مثال: SV123",
    },
    materializedColumn: "arrivalFlight",
  },

  departure_flight: {
    fieldKey: "departure_flight",
    section: "logistics",
    type: "text",
    label: {
      en: "Departure Flight Number",
      ar: "رقم رحلة المغادرة",
    },
    placeholder: {
      en: "e.g., SV456",
      ar: "مثال: SV456",
    },
    materializedColumn: "departureFlight",
  },

  transport_required: {
    fieldKey: "transport_required",
    section: "logistics",
    type: "radio",
    label: {
      en: "Do you require airport transportation?",
      ar: "هل تحتاج إلى نقل من المطار؟",
    },
    options: [
      { value: "yes", label: { en: "Yes", ar: "نعم" } },
      { value: "no", label: { en: "No", ar: "لا" } },
    ],
    materializedColumn: "transportRequired",
  },

  hotel_required: {
    fieldKey: "hotel_required",
    section: "logistics",
    type: "radio",
    label: {
      en: "Do you require hotel accommodation?",
      ar: "هل تحتاج إلى إقامة فندقية؟",
    },
    options: [
      { value: "yes", label: { en: "Yes", ar: "نعم" } },
      { value: "no", label: { en: "No", ar: "لا" } },
    ],
    materializedColumn: "hotelRequired",
  },

  hotel_checkin: {
    fieldKey: "hotel_checkin",
    section: "logistics",
    type: "date",
    label: {
      en: "Hotel Check-in Date",
      ar: "تاريخ تسجيل الدخول للفندق",
    },
    conditionalOn: {
      fieldKey: "hotel_required",
      operator: "equals",
      value: "yes",
    },
    materializedColumn: "hotelCheckin",
  },

  hotel_checkout: {
    fieldKey: "hotel_checkout",
    section: "logistics",
    type: "date",
    label: {
      en: "Hotel Check-out Date",
      ar: "تاريخ تسجيل الخروج من الفندق",
    },
    conditionalOn: {
      fieldKey: "hotel_required",
      operator: "equals",
      value: "yes",
    },
    materializedColumn: "hotelCheckout",
  },

  // === IMPORTANT TO KNOW SECTION ===
  dietary_type: {
    fieldKey: "dietary_type",
    section: "important_to_know",
    type: "select",
    label: {
      en: "Dietary Requirements",
      ar: "المتطلبات الغذائية",
    },
    options: [
      { value: "none", label: { en: "No restrictions", ar: "لا قيود" } },
      { value: "vegetarian", label: { en: "Vegetarian", ar: "نباتي" } },
      { value: "vegan", label: { en: "Vegan", ar: "نباتي صرف" } },
      { value: "halal", label: { en: "Halal", ar: "حلال" } },
      { value: "kosher", label: { en: "Kosher", ar: "كوشر" } },
      { value: "gluten_free", label: { en: "Gluten-free", ar: "خالي من الغلوتين" } },
      { value: "other", label: { en: "Other", ar: "أخرى" } },
    ],
    materializedColumn: "dietaryType",
  },

  dietary_details: {
    fieldKey: "dietary_details",
    section: "important_to_know",
    type: "textarea",
    label: {
      en: "Dietary Details / Allergies",
      ar: "تفاصيل غذائية / حساسية",
    },
    placeholder: {
      en: "Please specify any allergies or specific requirements",
      ar: "يرجى تحديد أي حساسية أو متطلبات محددة",
    },
    conditionalOn: {
      fieldKey: "dietary_type",
      operator: "not_equals",
      value: "none",
    },
    materializedColumn: "dietaryDetails",
  },

  accessibility_type: {
    fieldKey: "accessibility_type",
    section: "important_to_know",
    type: "select",
    label: {
      en: "Accessibility Requirements",
      ar: "متطلبات الوصول",
    },
    options: [
      { value: "none", label: { en: "None", ar: "لا شيء" } },
      { value: "wheelchair", label: { en: "Wheelchair access", ar: "وصول كرسي متحرك" } },
      { value: "hearing", label: { en: "Hearing assistance", ar: "مساعدة سمعية" } },
      { value: "visual", label: { en: "Visual assistance", ar: "مساعدة بصرية" } },
      { value: "mobility", label: { en: "Mobility assistance", ar: "مساعدة في التنقل" } },
      { value: "other", label: { en: "Other", ar: "أخرى" } },
    ],
    materializedColumn: "accessibilityType",
  },

  accessibility_details: {
    fieldKey: "accessibility_details",
    section: "important_to_know",
    type: "textarea",
    label: {
      en: "Accessibility Details",
      ar: "تفاصيل الوصول",
    },
    placeholder: {
      en: "Please describe your accessibility needs",
      ar: "يرجى وصف احتياجات الوصول الخاصة بك",
    },
    conditionalOn: {
      fieldKey: "accessibility_type",
      operator: "not_equals",
      value: "none",
    },
    materializedColumn: "accessibilityDetails",
  },

  emergency_contact_name: {
    fieldKey: "emergency_contact_name",
    section: "important_to_know",
    type: "text",
    label: {
      en: "Emergency Contact Name",
      ar: "اسم جهة اتصال الطوارئ",
    },
    materializedColumn: "emergencyContactName",
  },

  emergency_contact_phone: {
    fieldKey: "emergency_contact_phone",
    section: "important_to_know",
    type: "phone",
    label: {
      en: "Emergency Contact Phone",
      ar: "هاتف جهة اتصال الطوارئ",
    },
    placeholder: {
      en: "+966 5X XXX XXXX",
      ar: "+966 5X XXX XXXX",
    },
    materializedColumn: "emergencyContactPhone",
  },

  // === EXPERIENCE SECTION ===
  sessions_interested: {
    fieldKey: "sessions_interested",
    section: "experience",
    type: "checkbox",
    label: {
      en: "Which sessions are you interested in?",
      ar: "أي الجلسات تهتم بها؟",
    },
    description: {
      en: "Select all that apply",
      ar: "اختر كل ما ينطبق",
    },
    // Options are populated per event
    options: [],
    materializedColumn: "sessionsInterested",
  },
}

// ============================================================================
// Section Definitions
// ============================================================================

export const SECTION_DEFINITIONS: Record<
  SectionId,
  { title: { en: string; ar: string }; description?: { en: string; ar?: string } }
> = {
  personal_info: {
    title: {
      en: "Personal Information",
      ar: "المعلومات الشخصية",
    },
    description: {
      en: "Basic information about you",
      ar: "معلومات أساسية عنك",
    },
  },
  logistics: {
    title: {
      en: "Travel & Logistics",
      ar: "السفر والخدمات اللوجستية",
    },
    description: {
      en: "Your travel arrangements and accommodation needs",
      ar: "ترتيبات السفر واحتياجات الإقامة",
    },
  },
  experience: {
    title: {
      en: "Experience & Program",
      ar: "الخبرة والبرنامج",
    },
    description: {
      en: "Your preferences for the event program",
      ar: "تفضيلاتك لبرنامج الفعالية",
    },
  },
  important_to_know: {
    title: {
      en: "Important to Know",
      ar: "معلومات مهمة",
    },
    description: {
      en: "Dietary, accessibility, and emergency contact information",
      ar: "المعلومات الغذائية والوصول وجهات الاتصال في حالات الطوارئ",
    },
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all standard fields for a specific section
 */
export function getFieldsForSection(sectionId: SectionId): StandardFieldDefinition[] {
  return Object.values(STANDARD_FIELDS).filter((field) => field.section === sectionId)
}

/**
 * Get a standard field by its key
 */
export function getStandardField(fieldKey: string): StandardFieldDefinition | undefined {
  return STANDARD_FIELDS[fieldKey]
}

/**
 * Get all standard field keys
 */
export function getAllStandardFieldKeys(): string[] {
  return Object.keys(STANDARD_FIELDS)
}

/**
 * Check if a field key is a standard field
 */
export function isStandardField(fieldKey: string): boolean {
  return fieldKey in STANDARD_FIELDS
}

/**
 * Get the materialized column name for a standard field
 */
export function getMaterializedColumn(fieldKey: string): string | undefined {
  return STANDARD_FIELDS[fieldKey]?.materializedColumn
}

/**
 * Create a default form configuration with all sections and standard fields
 */
export function createDefaultFormConfig(): import("@/server/db/schemas/event").RsvpFormConfig {
  const sections: import("@/server/db/schemas/event").RsvpFormSection[] = [
    {
      id: "personal_info",
      title: SECTION_DEFINITIONS.personal_info.title,
      description: SECTION_DEFINITIONS.personal_info.description,
      enabled: true,
      sortOrder: 0,
      standardFields: getFieldsForSection("personal_info").map((field) => ({
        fieldKey: field.fieldKey,
        enabled: true,
        required: false,
      })),
      customFields: [],
    },
    {
      id: "logistics",
      title: SECTION_DEFINITIONS.logistics.title,
      description: SECTION_DEFINITIONS.logistics.description,
      enabled: true,
      sortOrder: 1,
      standardFields: getFieldsForSection("logistics").map((field) => ({
        fieldKey: field.fieldKey,
        enabled: true,
        required: field.fieldKey === "arrival_date" || field.fieldKey === "departure_date",
      })),
      customFields: [],
    },
    {
      id: "experience",
      title: SECTION_DEFINITIONS.experience.title,
      description: SECTION_DEFINITIONS.experience.description,
      enabled: true,
      sortOrder: 2,
      standardFields: getFieldsForSection("experience").map((field) => ({
        fieldKey: field.fieldKey,
        enabled: true,
        required: false,
      })),
      customFields: [],
    },
    {
      id: "important_to_know",
      title: SECTION_DEFINITIONS.important_to_know.title,
      description: SECTION_DEFINITIONS.important_to_know.description,
      enabled: true,
      sortOrder: 3,
      standardFields: getFieldsForSection("important_to_know").map((field) => ({
        fieldKey: field.fieldKey,
        enabled: true,
        required: field.fieldKey === "dietary_type",
      })),
      customFields: [],
    },
  ]

  return {
    sections,
    settings: {
      allowAmendments: true,
      showProgressIndicator: true,
      confirmationMessage: {
        en: "Thank you for confirming your attendance. We look forward to seeing you!",
        ar: "شكراً لتأكيد حضورك. نتطلع لرؤيتك!",
      },
      declineMessage: {
        en: "We're sorry you can't make it. Thank you for letting us know.",
        ar: "نأسف لعدم تمكنك من الحضور. شكراً لإعلامنا.",
      },
      submitButtonText: {
        en: "Submit RSVP",
        ar: "إرسال تأكيد الحضور",
      },
      // RSVP question customization
      showMaybeOption: true,
      rsvpQuestionLabel: {
        en: "RSVP",
        ar: "تأكيد الحضور",
      },
      confirmOptionLabel: {
        en: "Confirm Attendance",
        ar: "تأكيد الحضور",
      },
      declineOptionLabel: {
        en: "Decline",
        ar: "اعتذار",
      },
      maybeOptionLabel: {
        en: "Maybe",
        ar: "ربما",
      },
    },
  }
}

/**
 * Create a minimal form configuration with only required sections
 */
export function createMinimalFormConfig(): import("@/server/db/schemas/event").RsvpFormConfig {
  const config = createDefaultFormConfig()

  // Disable personal_info and experience sections
  config.sections = config.sections.map((section) => ({
    ...section,
    enabled: section.id === "important_to_know" || section.id === "logistics",
  }))

  return config
}
