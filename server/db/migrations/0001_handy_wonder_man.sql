CREATE TYPE "public"."event_status" AS ENUM('draft', 'planning', 'invitations_sent', 'rsvp_open', 'rsvp_closed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."guest_status" AS ENUM('pending', 'invited', 'reminded', 'viewed', 'confirmed', 'declined', 'maybe', 'waitlisted', 'cancelled', 'attended', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."email_template_type" AS ENUM('invitation', 'reminder', 'confirmation', 'declined_acknowledgment', 'update', 'cancellation', 'custom');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."bulk_email_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('pending', 'processing', 'completed', 'completed_with_errors', 'failed');--> statement-breakpoint
CREATE TYPE "public"."inventory_type_category" AS ENUM('hotel', 'flight', 'transport', 'venue', 'meal', 'gift', 'other');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workflow_action" AS ENUM('send_email', 'send_whatsapp', 'assign_category', 'allocate_inventory', 'create_task', 'notify_team', 'update_field', 'require_approval', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."workflow_trigger" AS ENUM('guest_imported', 'guest_created', 'rsvp_submitted', 'rsvp_confirmed', 'rsvp_declined', 'category_changed', 'inventory_allocated', 'email_bounced', 'manual', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."communication_channel" AS ENUM('whatsapp', 'sms', 'push_notification');--> statement-breakpoint
CREATE TYPE "public"."communication_status" AS ENUM('pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'expired');--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"event_type" text,
	"venue" text,
	"venue_address" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"timezone" text DEFAULT 'Asia/Riyadh',
	"rsvp_deadline" timestamp,
	"rsvp_form_config" json,
	"max_guests" integer,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"branding" json,
	"custom_domain" text,
	"settings" json,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "event_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "guest_category" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#6366f1',
	"service_allocations" json,
	"default_email_template_id" text,
	"rsvp_page_config" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "guest" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"category_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_name" text,
	"title" text,
	"salutation" text,
	"position" text,
	"entity" text,
	"department" text,
	"email" text,
	"phone" text,
	"whatsapp" text,
	"additional_contacts" json,
	"rsvp_token" text NOT NULL,
	"rsvp_token_expires_at" timestamp,
	"status" "guest_status" DEFAULT 'pending' NOT NULL,
	"rsvp_responded_at" timestamp,
	"has_companion" boolean DEFAULT false,
	"companion_details" json,
	"dietary_requirements" text,
	"accessibility_needs" text,
	"tags" json,
	"custom_fields" json,
	"internal_notes" text,
	"import_batch_id" text,
	"external_id" text,
	"last_email_sent_at" timestamp,
	"last_email_opened_at" timestamp,
	"last_rsvp_page_visit_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "guest_rsvp_token_unique" UNIQUE("rsvp_token")
);
--> statement-breakpoint
CREATE TABLE "rsvp_response" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"event_id" text NOT NULL,
	"response_status" text NOT NULL,
	"preferred_language" text,
	"arrival_date" timestamp,
	"departure_date" timestamp,
	"arrival_flight" text,
	"departure_flight" text,
	"hotel_required" boolean,
	"hotel_checkin" timestamp,
	"hotel_checkout" timestamp,
	"transport_required" boolean,
	"dietary_type" text,
	"dietary_details" text,
	"accessibility_type" text,
	"accessibility_details" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"sessions_interested" json,
	"custom_responses" json,
	"form_responses" json,
	"companion_info" json,
	"ip_address" text,
	"user_agent" text,
	"is_amendment" boolean DEFAULT false,
	"previous_response_id" text,
	"submitted_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvp_form_template" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"name" text NOT NULL,
	"description" text,
	"config" json NOT NULL,
	"category" text DEFAULT 'custom',
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_template" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "email_template_type" NOT NULL,
	"category_id" text,
	"content" jsonb NOT NULL,
	"default_language" text DEFAULT 'en' NOT NULL,
	"from_name" text,
	"from_email" text,
	"reply_to" text,
	"attachments" jsonb,
	"available_variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"event_id" text NOT NULL,
	"template_id" text,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"provider_response" json,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"bounced_at" timestamp,
	"error_message" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_email_job" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"template_id" text NOT NULL,
	"email_type" text NOT NULL,
	"status" "bulk_email_job_status" DEFAULT 'pending' NOT NULL,
	"total_emails" integer NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"guest_ids" json,
	"bullmq_job_id" text,
	"error_message" text,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "guest_import_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"file_name" text,
	"file_url" text,
	"status" "import_status" DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"duplicate_count" integer DEFAULT 0,
	"column_mapping" json,
	"errors" json,
	"started_at" timestamp,
	"completed_at" timestamp,
	"imported_by" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_inventory_allocation" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"inventory_item_id" text NOT NULL,
	"event_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'allocated' NOT NULL,
	"booking_reference" text,
	"confirmation_number" text,
	"notes" text,
	"custom_data" json,
	"allocated_at" timestamp NOT NULL,
	"confirmed_at" timestamp,
	"checked_in_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_item" (
	"id" text PRIMARY KEY NOT NULL,
	"inventory_type_id" text NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"hotel_name" text,
	"hotel_stars" integer,
	"room_type" text,
	"address" text,
	"airline" text,
	"flight_number" text,
	"flight_class" text,
	"departure_airport" text,
	"arrival_airport" text,
	"departure_time" timestamp,
	"arrival_time" timestamp,
	"vehicle_type" text,
	"pickup_location" text,
	"dropoff_location" text,
	"total_capacity" integer,
	"allocated_count" integer DEFAULT 0,
	"available_count" integer,
	"unit_cost" numeric(10, 2),
	"currency" text DEFAULT 'SAR',
	"start_date" timestamp,
	"end_date" timestamp,
	"vendor_name" text,
	"vendor_contact" text,
	"booking_reference" text,
	"confirmation_status" text,
	"custom_data" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_type" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"category" "inventory_type_category" NOT NULL,
	"description" text,
	"settings" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "guest_itinerary" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"event_id" text NOT NULL,
	"template_id" text,
	"customizations" json,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "itinerary_item" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"event_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"item_type" text,
	"day_number" integer DEFAULT 1 NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration_minutes" integer,
	"location" text,
	"location_details" json,
	"visible_to_categories" json,
	"dresscode" text,
	"notes" text,
	"attachments" json,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_optional" boolean DEFAULT false,
	"requires_rsvp" boolean DEFAULT false,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "itinerary_template" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "approval_request" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"workflow_step_id" text NOT NULL,
	"event_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"context" json,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"requested_approvers" json,
	"approved_by" text,
	"rejected_by" text,
	"decision_notes" text,
	"decided_at" timestamp,
	"expires_at" timestamp,
	"requested_by" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_step" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"step_order" integer DEFAULT 0 NOT NULL,
	"action" "workflow_action" NOT NULL,
	"action_config" json,
	"continue_on_error" boolean DEFAULT false,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"event_id" text,
	"name" text NOT NULL,
	"description" text,
	"trigger" "workflow_trigger" NOT NULL,
	"trigger_conditions" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"run_count" integer DEFAULT 0,
	"last_run_at" timestamp,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "communication" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"event_id" text NOT NULL,
	"channel" "communication_channel" NOT NULL,
	"status" "communication_status" DEFAULT 'pending' NOT NULL,
	"to_number" text,
	"to_device_token" text,
	"template_id" text,
	"template_name" text,
	"template_params" json,
	"message_content" text,
	"whatsapp_message_id" text,
	"whatsapp_conversation_id" text,
	"provider_message_id" text,
	"provider_response" json,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"error_code" text,
	"error_message" text,
	"cost" text,
	"currency" text DEFAULT 'SAR',
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "item" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "notification" CASCADE;--> statement-breakpoint
DROP TABLE "subscription" CASCADE;--> statement-breakpoint
DROP TABLE "item" CASCADE;--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_stripe_customer_id_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_stripe_subscription_id_unique";--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "user_setting" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_user_id_id_pk" PRIMARY KEY("user_id","id");--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_workspace_id_pk" PRIMARY KEY("user_id","workspace_id");--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id");--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "branding" json;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_category" ADD CONSTRAINT "guest_category_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest" ADD CONSTRAINT "guest_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest" ADD CONSTRAINT "guest_category_id_guest_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."guest_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_response" ADD CONSTRAINT "rsvp_response_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_response" ADD CONSTRAINT "rsvp_response_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_form_template" ADD CONSTRAINT "rsvp_form_template_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_form_template" ADD CONSTRAINT "rsvp_form_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_category_id_guest_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."guest_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_template_id_email_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_email_job" ADD CONSTRAINT "bulk_email_job_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_email_job" ADD CONSTRAINT "bulk_email_job_template_id_email_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_email_job" ADD CONSTRAINT "bulk_email_job_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_import_batch" ADD CONSTRAINT "guest_import_batch_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_import_batch" ADD CONSTRAINT "guest_import_batch_imported_by_user_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_inventory_allocation" ADD CONSTRAINT "guest_inventory_allocation_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_inventory_allocation" ADD CONSTRAINT "guest_inventory_allocation_inventory_item_id_inventory_item_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_inventory_allocation" ADD CONSTRAINT "guest_inventory_allocation_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_inventory_type_id_inventory_type_id_fk" FOREIGN KEY ("inventory_type_id") REFERENCES "public"."inventory_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_type" ADD CONSTRAINT "inventory_type_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_itinerary" ADD CONSTRAINT "guest_itinerary_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_itinerary" ADD CONSTRAINT "guest_itinerary_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_itinerary" ADD CONSTRAINT "guest_itinerary_template_id_itinerary_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."itinerary_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_item" ADD CONSTRAINT "itinerary_item_template_id_itinerary_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."itinerary_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_item" ADD CONSTRAINT "itinerary_item_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_template" ADD CONSTRAINT "itinerary_template_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_template" ADD CONSTRAINT "itinerary_template_category_id_guest_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."guest_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_workflow_step_id_workflow_step_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_step"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_rejected_by_user_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication" ADD CONSTRAINT "communication_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication" ADD CONSTRAINT "communication_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_workspace_idx" ON "event" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "event_slug_workspace_idx" ON "event" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "event_status_idx" ON "event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_start_date_idx" ON "event" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "guest_category_event_idx" ON "guest_category" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "guest_category_code_idx" ON "guest_category" USING btree ("event_id","code");--> statement-breakpoint
CREATE INDEX "guest_event_idx" ON "guest" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "guest_category_idx" ON "guest" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "guest_status_idx" ON "guest" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "guest_rsvp_token_idx" ON "guest" USING btree ("rsvp_token");--> statement-breakpoint
CREATE INDEX "guest_email_idx" ON "guest" USING btree ("event_id","email");--> statement-breakpoint
CREATE INDEX "rsvp_response_guest_idx" ON "rsvp_response" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "rsvp_response_event_idx" ON "rsvp_response" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rsvp_response_status_idx" ON "rsvp_response" USING btree ("event_id","response_status");--> statement-breakpoint
CREATE INDEX "rsvp_response_arrival_idx" ON "rsvp_response" USING btree ("event_id","arrival_date");--> statement-breakpoint
CREATE INDEX "rsvp_response_departure_idx" ON "rsvp_response" USING btree ("event_id","departure_date");--> statement-breakpoint
CREATE INDEX "rsvp_response_dietary_idx" ON "rsvp_response" USING btree ("event_id","dietary_type");--> statement-breakpoint
CREATE INDEX "rsvp_response_accessibility_idx" ON "rsvp_response" USING btree ("event_id","accessibility_type");--> statement-breakpoint
CREATE INDEX "rsvp_response_hotel_idx" ON "rsvp_response" USING btree ("event_id","hotel_required");--> statement-breakpoint
CREATE INDEX "rsvp_response_transport_idx" ON "rsvp_response" USING btree ("event_id","transport_required");--> statement-breakpoint
CREATE INDEX "rsvp_form_template_workspace_idx" ON "rsvp_form_template" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "rsvp_form_template_category_idx" ON "rsvp_form_template" USING btree ("category");--> statement-breakpoint
CREATE INDEX "rsvp_form_template_system_idx" ON "rsvp_form_template" USING btree ("is_system");--> statement-breakpoint
CREATE INDEX "email_template_event_idx" ON "email_template" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "email_template_type_idx" ON "email_template" USING btree ("event_id","type");--> statement-breakpoint
CREATE INDEX "email_log_guest_idx" ON "email_log" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "email_log_event_idx" ON "email_log" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "email_log_status_idx" ON "email_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bulk_email_job_event_idx" ON "bulk_email_job" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "bulk_email_job_status_idx" ON "bulk_email_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bulk_email_job_created_at_idx" ON "bulk_email_job" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "guest_import_event_idx" ON "guest_import_batch" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "guest_import_status_idx" ON "guest_import_batch" USING btree ("status");--> statement-breakpoint
CREATE INDEX "guest_inventory_guest_idx" ON "guest_inventory_allocation" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_inventory_item_idx" ON "guest_inventory_allocation" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "guest_inventory_event_idx" ON "guest_inventory_allocation" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "guest_inventory_status_idx" ON "guest_inventory_allocation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_item_type_idx" ON "inventory_item" USING btree ("inventory_type_id");--> statement-breakpoint
CREATE INDEX "inventory_item_event_idx" ON "inventory_item" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "inventory_type_event_idx" ON "inventory_type" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "inventory_type_category_idx" ON "inventory_type" USING btree ("event_id","category");--> statement-breakpoint
CREATE INDEX "guest_itinerary_guest_idx" ON "guest_itinerary" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_itinerary_event_idx" ON "guest_itinerary" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "itinerary_item_template_idx" ON "itinerary_item" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "itinerary_item_event_idx" ON "itinerary_item" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "itinerary_item_day_idx" ON "itinerary_item" USING btree ("template_id","day_number");--> statement-breakpoint
CREATE INDEX "itinerary_template_event_idx" ON "itinerary_template" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "itinerary_template_category_idx" ON "itinerary_template" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "approval_request_workflow_idx" ON "approval_request" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "approval_request_event_idx" ON "approval_request" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "approval_request_status_idx" ON "approval_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_request_entity_idx" ON "approval_request" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "workflow_step_workflow_idx" ON "workflow_step" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_step_order_idx" ON "workflow_step" USING btree ("workflow_id","step_order");--> statement-breakpoint
CREATE INDEX "workflow_workspace_idx" ON "workflow" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workflow_event_idx" ON "workflow" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "workflow_trigger_idx" ON "workflow" USING btree ("trigger");--> statement-breakpoint
CREATE INDEX "communication_guest_idx" ON "communication" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "communication_event_idx" ON "communication" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "communication_channel_idx" ON "communication" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "communication_status_idx" ON "communication" USING btree ("status");--> statement-breakpoint
CREATE INDEX "communication_sent_at_idx" ON "communication" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "workspace_member_user_workspace_idx" ON "workspace_member" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_member_role_id_idx" ON "workspace_member" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "workspace_member_status_idx" ON "workspace_member" USING btree ("status");--> statement-breakpoint
CREATE INDEX "role_permission_permission_id_idx" ON "role_permission" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "role_name_idx" ON "role" USING btree ("name");--> statement-breakpoint
ALTER TABLE "user_setting" DROP COLUMN "onboarding_status";--> statement-breakpoint
ALTER TABLE "user_setting" DROP COLUMN "onboarding_step";--> statement-breakpoint
ALTER TABLE "user_setting" DROP COLUMN "onboarding_completed_at";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "stripe_price_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "stripe_current_period_end";--> statement-breakpoint
ALTER TABLE "workspace" DROP COLUMN "subscription_id";--> statement-breakpoint
DROP TYPE "public"."onboarding_status";--> statement-breakpoint
DROP TYPE "public"."status";