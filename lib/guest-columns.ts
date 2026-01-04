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
  | "profileImage" // Guest photo avatar
  | "fullName" // Combined first + last name
  | "firstName"
  | "lastName"
  | "preferredName"
  | "displayNameAr"
  | "gender"
  | "title"
  | "salutation"
  | "salutationAr"
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
  | "lastEmailTemplateName"
  | "lastEmailOpenedAt"
  | "lastRsvpPageVisitAt"
  | "createdAt"
  | "emails" // Email status indicator
  | "attended" // Attendance toggle
  | "attendedAt" // Attendance timestamp
  | "attendedBy" // Who marked attendance
  | "serialNumber" // VAPP serial number
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
  group: "selection" | "personal" | "professional" | "contact" | "rsvp" | "requirements" | "meta" | "activity" | "attendance" | "actions"
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
    id: "profileImage",
    label: "Photo",
    labelAr: "الصورة",
    defaultVisible: true,
    defaultWidth: 48,
    minWidth: 48,
    maxWidth: 64,
    sortable: false,
    filterable: false,
    group: "personal",
  },
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
    id: "displayNameAr",
    label: "Arabic Name",
    labelAr: "الاسم بالعربية",
    defaultVisible: false,
    defaultWidth: 150,
    sortable: true,
    filterable: false,
    group: "personal",
  },
  {
    id: "gender",
    label: "Gender",
    labelAr: "الجنس",
    defaultVisible: false,
    defaultWidth: 90,
    sortable: true,
    filterable: true,
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
    id: "salutationAr",
    label: "Arabic Salutation",
    labelAr: "التحية بالعربية",
    defaultVisible: false,
    defaultWidth: 120,
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
  {
    id: "serialNumber",
    label: "Serial Number",
    labelAr: "الرقم التسلسلي",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    filterable: false,
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
    id: "lastEmailTemplateName",
    label: "Last Email Name",
    labelAr: "اسم آخر بريد",
    defaultVisible: false,
    defaultWidth: 180,
    sortable: true,
    filterable: true,
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

  // Attendance
  {
    id: "attended",
    label: "Attendance",
    labelAr: "الحضور",
    defaultVisible: false,
    defaultWidth: 90,
    sortable: true,
    filterable: true,
    group: "attendance",
  },
  {
    id: "attendedAt",
    label: "Attended At",
    labelAr: "وقت الحضور",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: true,
    filterable: false,
    group: "attendance",
  },
  {
    id: "attendedBy",
    label: "Logged By",
    labelAr: "سجّل بواسطة",
    defaultVisible: false,
    defaultWidth: 140,
    sortable: false,
    filterable: false,
    group: "attendance",
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

/**
 * Ensures a view config has all columns from GUEST_COLUMNS.
 * - Adds missing columns (new columns added to schema)
 * - Preserves existing column visibility/width settings
 * - Removes columns that no longer exist in GUEST_COLUMNS
 */
export function syncViewConfigColumns(
  config: GuestListViewConfig
): GuestListViewConfig {
  const existingColumnIds = new Set(config.columns.map((c) => c.id))
  const validColumnIds = new Set(GUEST_COLUMNS.map((c) => c.id))

  // Keep existing columns that still exist in GUEST_COLUMNS
  const existingColumns = config.columns.filter((c) =>
    validColumnIds.has(c.id as GuestColumnId)
  )

  // Find new columns not in the config
  const newColumns: GuestListViewColumnConfig[] = GUEST_COLUMNS
    .filter((col) => !existingColumnIds.has(col.id))
    .map((col) => ({
      id: col.id,
      visible: col.defaultVisible,
      width: col.defaultWidth,
    }))

  // Insert new columns at their correct positions based on GUEST_COLUMNS order
  const mergedColumns: GuestListViewColumnConfig[] = []
  const existingMap = new Map(existingColumns.map((c) => [c.id, c]))
  const newMap = new Map(newColumns.map((c) => [c.id, c]))

  for (const colDef of GUEST_COLUMNS) {
    if (existingMap.has(colDef.id)) {
      mergedColumns.push(existingMap.get(colDef.id)!)
    } else if (newMap.has(colDef.id)) {
      mergedColumns.push(newMap.get(colDef.id)!)
    }
  }

  return {
    ...config,
    columns: mergedColumns,
  }
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
  attendance: { en: "Attendance", ar: "الحضور" },
  actions: { en: "Actions", ar: "الإجراءات" },
}
