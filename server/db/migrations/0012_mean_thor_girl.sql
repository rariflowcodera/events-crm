CREATE TABLE "guest_list_view" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config" json NOT NULL,
	"visible_to_roles" json DEFAULT '["owner","admin","manager","member"]'::json NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"pin_order" integer,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "guest_list_view" ADD CONSTRAINT "guest_list_view_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_view" ADD CONSTRAINT "guest_list_view_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_list_view" ADD CONSTRAINT "guest_list_view_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_list_view_event_idx" ON "guest_list_view" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "guest_list_view_pinned_idx" ON "guest_list_view" USING btree ("event_id","is_pinned","pin_order");