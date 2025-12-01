import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { events } from "./event"
import { users } from "./user"
import { workspaces } from "./workspace"

// Workflow trigger types
export const workflowTriggerEnum = pgEnum("workflow_trigger", [
  "guest_imported",
  "guest_created",
  "rsvp_submitted",
  "rsvp_confirmed",
  "rsvp_declined",
  "category_changed",
  "inventory_allocated",
  "email_bounced",
  "manual",
  "scheduled",
])

// Workflow action types
export const workflowActionEnum = pgEnum("workflow_action", [
  "send_email",
  "send_whatsapp",
  "assign_category",
  "allocate_inventory",
  "create_task",
  "notify_team",
  "update_field",
  "require_approval",
  "webhook",
])

// Workflows (automation rules)
export const workflows = pgTable(
  "workflow",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    eventId: text("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),

    name: text("name").notNull(),
    description: text("description"),

    trigger: workflowTriggerEnum("trigger").notNull(),
    triggerConditions: json("trigger_conditions").$type<{
      categoryIds?: string[]
      guestStatuses?: string[]
      customConditions?: Array<{
        field: string
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than"
        value: unknown
      }>
    }>(),

    isActive: boolean("is_active").notNull().default(true),
    isGlobal: boolean("is_global").notNull().default(false),

    runCount: integer("run_count").default(0),
    lastRunAt: timestamp("last_run_at", { mode: "date" }),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("workflow_workspace_idx").on(table.workspaceId),
    index("workflow_event_idx").on(table.eventId),
    index("workflow_trigger_idx").on(table.trigger),
  ]
)

// Workflow Steps (actions in a workflow)
export const workflowSteps = pgTable(
  "workflow_step",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),

    stepOrder: integer("step_order").notNull().default(0),

    action: workflowActionEnum("action").notNull(),
    actionConfig: json("action_config").$type<{
      // For send_email
      templateId?: string
      delayMinutes?: number

      // For send_whatsapp
      whatsappTemplateId?: string
      message?: string

      // For assign_category
      categoryId?: string

      // For allocate_inventory
      inventoryTypeId?: string
      allocationRules?: Record<string, unknown>

      // For notify_team
      notifyUserIds?: string[]
      notifyRoles?: string[]
      notificationMessage?: string

      // For update_field
      fieldName?: string
      fieldValue?: unknown

      // For require_approval
      approverUserIds?: string[]
      approverRoles?: string[]
      approvalMessage?: string
      timeoutHours?: number

      // For webhook
      webhookUrl?: string
      webhookMethod?: "GET" | "POST"
      webhookHeaders?: Record<string, string>
      webhookPayload?: Record<string, unknown>
    }>(),

    continueOnError: boolean("continue_on_error").default(false),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { mode: "date" }),
  },
  (table) => [
    index("workflow_step_workflow_idx").on(table.workflowId),
    index("workflow_step_order_idx").on(table.workflowId, table.stepOrder),
  ]
)

// Approval request status
export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
  "cancelled",
])

// Approval Requests
export const approvalRequests = pgTable(
  "approval_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),

    workflowStepId: text("workflow_step_id")
      .notNull()
      .references(() => workflowSteps.id, { onDelete: "cascade" }),

    eventId: text("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),

    // What needs approval
    entityType: text("entity_type").notNull().$type<"guest" | "inventory" | "category" | "other">(),
    entityId: text("entity_id").notNull(),

    title: text("title").notNull(),
    description: text("description"),
    context: json("context").$type<Record<string, unknown>>(),

    status: approvalStatusEnum("status").notNull().default("pending"),

    // Approvers
    requestedApprovers: json("requested_approvers").$type<string[]>(),
    approvedBy: text("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectedBy: text("rejected_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Decision info
    decisionNotes: text("decision_notes"),
    decidedAt: timestamp("decided_at", { mode: "date" }),

    // Expiry
    expiresAt: timestamp("expires_at", { mode: "date" }),

    requestedBy: text("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("approval_request_workflow_idx").on(table.workflowId),
    index("approval_request_event_idx").on(table.eventId),
    index("approval_request_status_idx").on(table.status),
    index("approval_request_entity_idx").on(table.entityType, table.entityId),
  ]
)

// Relations
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workflows.workspaceId],
    references: [workspaces.id],
  }),
  event: one(events, {
    fields: [workflows.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [workflows.createdBy],
    references: [users.id],
  }),
  steps: many(workflowSteps),
  approvalRequests: many(approvalRequests),
}))

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
}))

export const approvalRequestsRelations = relations(
  approvalRequests,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [approvalRequests.workflowId],
      references: [workflows.id],
    }),
    workflowStep: one(workflowSteps, {
      fields: [approvalRequests.workflowStepId],
      references: [workflowSteps.id],
    }),
    event: one(events, {
      fields: [approvalRequests.eventId],
      references: [events.id],
    }),
    approver: one(users, {
      fields: [approvalRequests.approvedBy],
      references: [users.id],
      relationName: "approver",
    }),
    rejecter: one(users, {
      fields: [approvalRequests.rejectedBy],
      references: [users.id],
      relationName: "rejecter",
    }),
    requester: one(users, {
      fields: [approvalRequests.requestedBy],
      references: [users.id],
      relationName: "requester",
    }),
  })
)
