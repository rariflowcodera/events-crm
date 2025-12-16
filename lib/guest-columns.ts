import {
  VIEW_COLORS,
  type ViewColor,
  type GuestListViewConfig,
  type GuestListViewColumnConfig,
  type GuestListViewFilterConfig,
  type GuestListViewSortConfig,
} from "@/server/db/schemas/guest-list-view"

// Re-export types and constants from schema
export { VIEW_COLORS }
export type { ViewColor, GuestListViewConfig, GuestListViewColumnConfig, GuestListViewFilterConfig, GuestListViewSortConfig }

// ============================================================================
// Column Identifiers
// ============================================================================

export type GuestColumnId =
  | "select" // Checkbox column
  | "fullName" // Combined first + last name
  | "firstName"
  | "lastName"
  | "preferredName"
  | "title"
  | "salutation"
  | "email"
  | "phone"
  | "whatsapp"
  | "entity"
  | "position"
  | "department"
  | "country"
  | "status"
  | "category"
  | "dietaryRequirements"
  | "accessibilityNeeds"
  | "hasCompanion"
  | "tags"
  | "internalNotes"
  | "rsvpRespondedAt"
  | "lastEmailSentAt"
  | "lastEmailOpenedAt"
  | "lastRsvpPageVisitAt"
  | "createdAt"
  | "emails" // Email status indicator
  | "checkedIn" // Check-in toggle
  | "checkedInAt" // Check-in timestamp
  | "checkedInBy" // Who checked them in
  | "actions" // Row actions

// ============================================================================
// Column Definition Type
// ============================================================================

export interface GuestColumnDefinition {
  id: GuestColumnId
  label: string
  labelAr: string
  defaultVisible: boolean
  defaultWidth: number
  minWidth?: number
  maxWidth?: number
  sortable: boolean
  filterable: boolean
  fixed?: "left" | "right" // For pinned columns
  group: "selection" | "personal" | "professional" | "contact" | "rsvp" | "requirements" | "meta" | "activity" | "checkin" | "actions"
}

// ============================================================================
// Column Definitions
// ============================================================================

export const GUEST_COLUMNS: GuestColumnDefinition[] = [
  // Selection
  {
    id: "select",
    label: "",
    labelAr: "",
    defaultVisible: true,
    defaultWidth: 48,
    sortable: false,
    filterable: false,
    fixed: "left",
    group: "selection",
  },

  // Personal
  {
    id: "fullName",
    label: "Name",
    labelAr: "الاسم",
    defaultVisible: true,
    defaultWidth: 180,
    minWidth: 120,
    maxWidth: 300,
    sortable: true,
    filterable: true,
    group: "personal",
  },
  {
    id: "firstName",
    label: "First Name",
    labelAr: "الاسم الأول",
    defaultVisible: false,
    defaultWidth: 120,
    sortable: true,
    filterable: true,
    group: "personal",
  },
  {
    id: "lastName",
    label: "Last Name",
    labelAr: "اسم العائلة",
    defaultVisible: false,
    defaultWidth: 120,
    sortable: true,
    filterable: true,
    group: "personal",
  },
  {
    id: "preferredName",
    label: "Preferred Name",
    labelAr: "الاسم المفضل",
    defaultVisible: false,
    defaultWidth: 130,
    sortable: true,
    filterable: false,
    group: "personal",
  },
  {
    id: "title",
    label: "Title",
    labelAr: "اللقب",
    defaultVisible: false,
    defaultWidth: 80,
    sortable: true,
    filterable: false,
    group: "personal",
  },
  {
    id: "salutation",
    label: "Salutation",
    labelAr: "التحية",
    defaultVisible: false,
    defaultWidth: 100,
    sortable: false,
    filterable: false,
    group: "personal",
  },
  {
    id: "country",
    label: "Country",
    labelAr: "الدولة",
    defaultVisible: true,
    defaultWidth: 130,
    sortable: true,
    filterable: true,
    group: "personal",
  },

  // Professional
  {
    id: "entity",
    label: "Entity",
    labelAr: "الجهة",
    defaultVisible: true,
    defaultWidth: 150,
    minWidth: 100,
    sortable: true,
    filterable: true,
    group: "professional",
  },
  {
    id: "position",
    label: "Position",
    labelAr: "المنصب",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: true,
    filterable: true,
    group: "professional",
  },
  {
    id: "department",
    label: "Department",
    labelAr: "القسم",
    defaultVisible: false,
    defaultWidth: 130,
    sortable: true,
    filterable: true,
    group: "professional",
  },

  // Contact
  {
    id: "email",
    label: "Email",
    labelAr: "البريد الإلكتروني",
    defaultVisible: true,
    defaultWidth: 220,
    minWidth: 150,
    sortable: true,
    filterable: true,
    group: "contact",
  },
  {
    id: "phone",
    label: "Phone",
    labelAr: "الهاتف",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: false,
    filterable: false,
    group: "contact",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    labelAr: "واتساب",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: false,
    filterable: false,
    group: "contact",
  },

  // RSVP
  {
    id: "status",
    label: "Status",
    labelAr: "الحالة",
    defaultVisible: true,
    defaultWidth: 110,
    sortable: true,
    filterable: true,
    group: "rsvp",
  },
  {
    id: "category",
    label: "Category",
    labelAr: "الفئة",
    defaultVisible: true,
    defaultWidth: 100,
    sortable: true,
    filterable: true,
    group: "rsvp",
  },
  {
    id: "rsvpRespondedAt",
    label: "RSVP Date",
    labelAr: "تاريخ الرد",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    filterable: false,
    group: "rsvp",
  },

  // Requirements
  {
    id: "dietaryRequirements",
    label: "Dietary",
    labelAr: "النظام الغذائي",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: false,
    filterable: true,
    group: "requirements",
  },
  {
    id: "accessibilityNeeds",
    label: "Accessibility",
    labelAr: "احتياجات خاصة",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: false,
    filterable: true,
    group: "requirements",
  },
  {
    id: "hasCompanion",
    label: "Companion",
    labelAr: "مرافق",
    defaultVisible: false,
    defaultWidth: 100,
    sortable: true,
    filterable: true,
    group: "requirements",
  },

  // Metadata
  {
    id: "tags",
    label: "Tags",
    labelAr: "الوسوم",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: false,
    filterable: true,
    group: "meta",
  },
  {
    id: "internalNotes",
    label: "Notes",
    labelAr: "ملاحظات",
    defaultVisible: false,
    defaultWidth: 200,
    sortable: false,
    filterable: true,
    group: "meta",
  },

  // Activity
  {
    id: "lastEmailSentAt",
    label: "Last Email",
    labelAr: "آخر بريد",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    filterable: false,
    group: "activity",
  },
  {
    id: "lastEmailOpenedAt",
    label: "Last Opened",
    labelAr: "آخر فتح",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    filterable: false,
    group: "activity",
  },
  {
    id: "lastRsvpPageVisitAt",
    label: "Last Visit",
    labelAr: "آخر زيارة",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    filterable: false,
    group: "activity",
  },
  {
    id: "createdAt",
    label: "Created",
    labelAr: "تاريخ الإنشاء",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    filterable: false,
    group: "activity",
  },
  {
    id: "emails",
    label: "Emails",
    labelAr: "البريد",
    defaultVisible: true,
    defaultWidth: 70,
    sortable: false,
    filterable: false,
    group: "activity",
  },

  // Check-in
  {
    id: "checkedIn",
    label: "Check-in",
    labelAr: "تسجيل الحضور",
    defaultVisible: false,
    defaultWidth: 90,
    sortable: true,
    filterable: true,
    group: "checkin",
  },
  {
    id: "checkedInAt",
    label: "Checked In At",
    labelAr: "وقت التسجيل",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    filterable: false,
    group: "checkin",
  },
  {
    id: "checkedInBy",
    label: "Checked In By",
    labelAr: "تم التسجيل بواسطة",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: false,
    filterable: false,
    group: "checkin",
  },

  // Actions
  {
    id: "actions",
    label: "",
    labelAr: "",
    defaultVisible: true,
    defaultWidth: 50,
    sortable: false,
    filterable: false,
    fixed: "right",
    group: "actions",
  },
]

// ============================================================================
// Default View Configuration
// ============================================================================

export const DEFAULT_VIEW_CONFIG: GuestListViewConfig = {
  columns: GUEST_COLUMNS.map((col) => ({
    id: col.id,
    visible: col.defaultVisible,
    width: col.defaultWidth,
  })),
  filters: {},
  sorting: [{ column: "createdAt", direction: "desc" }],
}

// ============================================================================
// Helpers
// ============================================================================

export function getColumnDefinition(
  columnId: GuestColumnId
): GuestColumnDefinition | undefined {
  return GUEST_COLUMNS.find((col) => col.id === columnId)
}

export function getVisibleColumns(
  config: GuestListViewConfig
): GuestColumnDefinition[] {
  return config.columns
    .filter((col) => col.visible)
    .map((col) => getColumnDefinition(col.id as GuestColumnId))
    .filter(Boolean) as GuestColumnDefinition[]
}

export function getColumnGroups(): Record<string, GuestColumnDefinition[]> {
  const groups: Record<string, GuestColumnDefinition[]> = {}
  for (const col of GUEST_COLUMNS) {
    if (!groups[col.group]) {
      groups[col.group] = []
    }
    groups[col.group].push(col)
  }
  return groups
}

export const COLUMN_GROUP_LABELS: Record<string, { en: string; ar: string }> = {
  selection: { en: "Selection", ar: "التحديد" },
  personal: { en: "Personal", ar: "شخصي" },
  professional: { en: "Professional", ar: "مهني" },
  contact: { en: "Contact", ar: "الاتصال" },
  rsvp: { en: "RSVP", ar: "الرد" },
  requirements: { en: "Requirements", ar: "المتطلبات" },
  meta: { en: "Metadata", ar: "البيانات" },
  activity: { en: "Activity", ar: "النشاط" },
  checkin: { en: "Check-in", ar: "تسجيل الحضور" },
  actions: { en: "Actions", ar: "الإجراءات" },
}
