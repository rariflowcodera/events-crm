/**
 * RSVP Form System Types
 *
 * Re-exports types from the schema for use throughout the application,
 * plus additional utility types for form building and rendering.
 */

// Re-export schema types from event schema
export type {
  BilingualText,
  StandardFieldConfig,
  FieldValidation,
  FieldConditional,
  CustomFieldDefinition,
  RsvpFormSectionId,
  RsvpFormSection,
  RsvpFormSettings,
  RsvpFormConfig,
} from "@/server/db/schemas/event"

// Re-export Zod validation types
export type {
  CustomFieldDefinitionInput,
  StandardFieldConfigInput,
  RsvpFormSectionInput,
  RsvpFormSettingsInput,
  RsvpFormConfigInput,
} from "@/lib/schemas"

export type { RsvpFormTemplateCategory } from "@/server/db/schemas/rsvp-form-template"

// ============================================================================
// Standard Field Types
// ============================================================================

/** All standard field keys that map to materialized columns */
export type StandardFieldKey =
  // Personal Info
  | "preferred_language"
  // Logistics
  | "arrival_date"
  | "departure_date"
  | "arrival_flight"
  | "departure_flight"
  | "hotel_required"
  | "hotel_checkin"
  | "hotel_checkout"
  | "transport_required"
  // Important to Know
  | "dietary_type"
  | "dietary_details"
  | "accessibility_type"
  | "accessibility_details"
  | "emergency_contact_name"
  | "emergency_contact_phone"
  // Experience
  | "sessions_interested"

/** Field types supported by the form system */
export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "number"
  | "email"
  | "phone"

/** Section IDs */
export type SectionId = "personal_info" | "logistics" | "experience" | "important_to_know"

// ============================================================================
// Standard Field Definition
// ============================================================================

/** Definition of a standard field in the field library */
export interface StandardFieldDefinition {
  fieldKey: StandardFieldKey
  section: SectionId
  type: FieldType
  label: { en: string; ar: string }
  description?: { en: string; ar?: string }
  placeholder?: { en: string; ar?: string }
  options?: Array<{ value: string; label: { en: string; ar: string } }>
  conditionalOn?: {
    fieldKey: string
    operator?: "equals" | "not_equals" | "contains" | "not_empty"
    value?: string | string[] | boolean
  }
  /** The column name in rsvp_responses table */
  materializedColumn: string
}

// ============================================================================
// Dietary and Accessibility Types
// ============================================================================

export type DietaryType =
  | "none"
  | "vegetarian"
  | "vegan"
  | "halal"
  | "kosher"
  | "gluten_free"
  | "other"

export type AccessibilityType =
  | "none"
  | "wheelchair"
  | "hearing"
  | "visual"
  | "mobility"
  | "other"

// ============================================================================
// Form Rendering Types
// ============================================================================

/** Props for rendering a dynamic form field */
export interface DynamicFieldProps {
  fieldKey: string
  type: FieldType
  label: string
  description?: string
  placeholder?: string
  required: boolean
  options?: Array<{ value: string; label: string }>
  validation?: import("@/server/db/schemas/event").FieldValidation
  disabled?: boolean
}

/** Props for rendering a form section */
export interface FormSectionProps {
  id: SectionId
  title: string
  description?: string
  enabled: boolean
  fields: DynamicFieldProps[]
}

/** Complete rendered form structure */
export interface RenderedFormConfig {
  sections: FormSectionProps[]
  settings: {
    allowAmendments: boolean
    showProgressIndicator: boolean
    confirmationMessage?: string
    declineMessage?: string
    maybeMessage?: string
    submitButtonText?: string
  }
}

// ============================================================================
// Form Builder Types
// ============================================================================

/** State for the form builder */
export interface FormBuilderState {
  config: import("@/server/db/schemas/event").RsvpFormConfig
  activeSection: SectionId | null
  activeField: string | null
  activeLanguage: "en" | "ar"
  isDirty: boolean
}

/** Actions for the form builder */
export type FormBuilderAction =
  | { type: "SET_CONFIG"; payload: import("@/server/db/schemas/event").RsvpFormConfig }
  | { type: "TOGGLE_SECTION"; payload: SectionId }
  | { type: "REORDER_SECTIONS"; payload: SectionId[] }
  | { type: "TOGGLE_STANDARD_FIELD"; payload: { sectionId: SectionId; fieldKey: string } }
  | { type: "UPDATE_STANDARD_FIELD"; payload: { sectionId: SectionId; fieldKey: string; config: Partial<import("@/server/db/schemas/event").StandardFieldConfig> } }
  | { type: "ADD_CUSTOM_FIELD"; payload: { sectionId: SectionId; field: import("@/server/db/schemas/event").CustomFieldDefinition } }
  | { type: "UPDATE_CUSTOM_FIELD"; payload: { sectionId: SectionId; fieldId: string; field: Partial<import("@/server/db/schemas/event").CustomFieldDefinition> } }
  | { type: "DELETE_CUSTOM_FIELD"; payload: { sectionId: SectionId; fieldId: string } }
  | { type: "REORDER_CUSTOM_FIELDS"; payload: { sectionId: SectionId; fieldIds: string[] } }
  | { type: "UPDATE_SETTINGS"; payload: Partial<import("@/server/db/schemas/event").RsvpFormSettings> }
  | { type: "SET_ACTIVE_SECTION"; payload: SectionId | null }
  | { type: "SET_ACTIVE_FIELD"; payload: string | null }
  | { type: "SET_ACTIVE_LANGUAGE"; payload: "en" | "ar" }
  | { type: "MARK_CLEAN" }

// ============================================================================
// Report Types
// ============================================================================

/** Dietary breakdown stats */
export interface DietaryStats {
  type: DietaryType | null
  count: number
}

/** Accessibility breakdown stats */
export interface AccessibilityStats {
  type: AccessibilityType | null
  count: number
}

/** Arrival/departure timeline stats */
export interface DateStats {
  date: Date | null
  count: number
}

/** Hotel requirements summary */
export interface HotelRequirement {
  guestId: string
  guestName: string
  checkin: Date | null
  checkout: Date | null
  category: string
}

/** Transport requirements summary */
export interface TransportRequirement {
  guestId: string
  guestName: string
  arrivalDate: Date | null
  arrivalFlight: string | null
  departureDate: Date | null
  departureFlight: string | null
  category: string
}

/** RSVP summary stats */
export interface RsvpSummary {
  total: number
  confirmed: number
  declined: number
  maybe: number
  pending: number
  withDietaryNeeds: number
  withAccessibilityNeeds: number
  needingHotel: number
  needingTransport: number
}
