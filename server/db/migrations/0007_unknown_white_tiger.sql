CREATE TABLE "event_form" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"purpose" text DEFAULT 'custom',
	"form_config" json NOT NULL,
	"access_type" text DEFAULT 'email',
	"visible_to_categories" json,
	"allow_multiple_submissions" boolean DEFAULT false NOT NULL,
	"allow_amendments" boolean DEFAULT true NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"expires_at" timestamp,
	"short_code" text,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "event_form_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "form_response" (
	"id" text PRIMARY KEY NOT NULL,
	"form_id" text NOT NULL,
	"event_id" text NOT NULL,
	"guest_id" text NOT NULL,
	"guest_email" text NOT NULL,
	"responses" json NOT NULL,
	"is_amendment" boolean DEFAULT false NOT NULL,
	"previous_response_id" text,
	"ip_address" text,
	"user_agent" text,
	"submitted_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_form" ADD CONSTRAINT "event_form_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_form" ADD CONSTRAINT "event_form_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_form" ADD CONSTRAINT "event_form_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_response" ADD CONSTRAINT "form_response_form_id_event_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."event_form"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_response" ADD CONSTRAINT "form_response_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_response" ADD CONSTRAINT "form_response_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_form_event_idx" ON "event_form" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_form_workspace_idx" ON "event_form" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_form_event_slug_idx" ON "event_form" USING btree ("event_id","slug");--> statement-breakpoint
CREATE INDEX "event_form_short_code_idx" ON "event_form" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "event_form_purpose_idx" ON "event_form" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "event_form_published_idx" ON "event_form" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "form_response_form_idx" ON "form_response" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_response_event_idx" ON "form_response" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "form_response_guest_idx" ON "form_response" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "form_response_email_idx" ON "form_response" USING btree ("guest_email");--> statement-breakpoint
CREATE INDEX "form_response_submitted_idx" ON "form_response" USING btree ("form_id","submitted_at");