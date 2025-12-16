CREATE TABLE "email_master_template" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"event_id" text,
	"name" text NOT NULL,
	"description" text,
	"html_template" text NOT NULL,
	"structure" json,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "email_template" ADD COLUMN "structured_content" jsonb;--> statement-breakpoint
ALTER TABLE "email_template" ADD COLUMN "master_template_id" text;--> statement-breakpoint
ALTER TABLE "email_master_template" ADD CONSTRAINT "email_master_template_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_master_template" ADD CONSTRAINT "email_master_template_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_master_template" ADD CONSTRAINT "email_master_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_master_template_workspace_idx" ON "email_master_template" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "email_master_template_event_idx" ON "email_master_template" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_master_template_id_email_master_template_id_fk" FOREIGN KEY ("master_template_id") REFERENCES "public"."email_master_template"("id") ON DELETE set null ON UPDATE no action;