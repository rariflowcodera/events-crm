/**
 * Generic Event Forms System Types
 *
 * Re-exports types from the schema for use throughout the application,
 * plus additional utility types for form building and rendering.
 */

// Re-export schema types from event-form schema
export type {
  FormPurpose,
  FormAccessType,
  FormFieldConfig,
  FormSectionConfig,
  FormSettings,
  FormConfig,
} from "@/server/db/schemas/event-form"

// Re-export shared types from event schema (for form field definitions)
export type {
  BilingualText,
  FieldValidation,
  FieldConditional,
} from "@/server/db/schemas/event"

// ============================================================================
// Field Types
// ============================================================================

/** Field types supported by the generic form system */
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

// ============================================================================
// Form Rendering Types
// ============================================================================

/** Props for rendering a dynamic form field */
export interface DynamicFieldProps {
  fieldId: string
  type: FieldType
  label: string
  description?: string
  placeholder?: string
  required: boolean
  options?: Array<{ value: string; label: string }>
  validation?: FieldValidation
  disabled?: boolean
}

/** Props for rendering a form section */
export interface FormSectionRenderProps {
  id: string
  title: string
  description?: string
  enabled: boolean
  fields: DynamicFieldProps[]
}

/** Complete rendered form structure (language-resolved) */
export interface RenderedFormConfig {
  sections: FormSectionRenderProps[]
  settings: {
    showProgressIndicator: boolean
    confirmationMessage?: string
    submitButtonText?: string
  }
}

// ============================================================================
// Form Builder Types
// ============================================================================

/** State for the generic form builder */
export interface FormBuilderState {
  config: FormConfig
  activeSection: string | null
  activeField: string | null
  activeLanguage: "en" | "ar"
  isDirty: boolean
}

/** Actions for the generic form builder */
export type FormBuilderAction =
  | { type: "SET_CONFIG"; payload: FormConfig }
  | { type: "ADD_SECTION"; payload: FormSectionConfig }
  | { type: "UPDATE_SECTION"; payload: { sectionId: string; section: Partial<FormSectionConfig> } }
  | { type: "DELETE_SECTION"; payload: string }
  | { type: "TOGGLE_SECTION"; payload: string }
  | { type: "REORDER_SECTIONS"; payload: string[] }
  | { type: "ADD_FIELD"; payload: { sectionId: string; field: FormFieldConfig } }
  | { type: "UPDATE_FIELD"; payload: { sectionId: string; fieldId: string; field: Partial<FormFieldConfig> } }
  | { type: "DELETE_FIELD"; payload: { sectionId: string; fieldId: string } }
  | { type: "REORDER_FIELDS"; payload: { sectionId: string; fieldIds: string[] } }
  | { type: "UPDATE_SETTINGS"; payload: Partial<FormSettings> }
  | { type: "SET_ACTIVE_SECTION"; payload: string | null }
  | { type: "SET_ACTIVE_FIELD"; payload: string | null }
  | { type: "SET_ACTIVE_LANGUAGE"; payload: "en" | "ar" }
  | { type: "MARK_CLEAN" }

// ============================================================================
// Form Access Types
// ============================================================================

/** Guest lookup result for email identification */
export interface GuestLookupResult {
  found: boolean
  guest?: {
    id: string
    firstName: string
    lastName: string
    email: string
    categoryId: string
    categoryName: string
  }
  error?: string
}

/** Form access info returned to public form page */
export interface FormAccessInfo {
  form: {
    id: string
    name: string
    description?: string | null
    purpose: string | null
    formConfig: FormConfig
    accessType: "token" | "email"
    visibleToCategories: string[] | null
    allowMultipleSubmissions: boolean
    allowAmendments: boolean
    expiresAt: Date | null
  }
  event: {
    id: string
    name: string
    slug: string
    startDate: Date | null
    endDate: Date | null
    venue: string | null
  }
  branding?: {
    logo?: string
    primaryColor?: string
    backgroundImage?: string
  }
}

/** Form submission payload */
export interface FormSubmissionPayload {
  responses: Record<string, unknown>
}

/** Form submission result */
export interface FormSubmissionResult {
  success: boolean
  responseId?: string
  isAmendment?: boolean
  message?: string
  error?: string
}

// ============================================================================
// Response Types
// ============================================================================

/** Form response with guest info for listing */
export interface FormResponseWithGuest {
  id: string
  formId: string
  eventId: string
  guestId: string
  guestEmail: string
  responses: Record<string, unknown>
  isAmendment: boolean
  submittedAt: Date
  guest: {
    firstName: string
    lastName: string
    email: string
    categoryName?: string
  }
}

/** Form response summary stats */
export interface FormResponseSummary {
  total: number
  byCategory: Array<{
    categoryId: string
    categoryName: string
    count: number
  }>
  recentResponses: number // Last 24 hours
}

// ============================================================================
// Import type for FormConfig
// ============================================================================

import type {
  FormConfig,
  FormSectionConfig,
  FormFieldConfig,
  FormSettings,
} from "@/server/db/schemas/event-form"

import type { FieldValidation } from "@/server/db/schemas/event"
