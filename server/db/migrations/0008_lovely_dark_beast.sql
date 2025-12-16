CREATE TYPE "public"."event_document_type" AS ENUM('schedule', 'map', 'policy', 'brochure', 'invitation', 'other');--> statement-breakpoint
CREATE TABLE "event_document" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"type" "event_document_type" DEFAULT 'other' NOT NULL,
	"category_ids" jsonb,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "event_document" ADD CONSTRAINT "event_document_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_document" ADD CONSTRAINT "event_document_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_document_event_idx" ON "event_document" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_document_type_idx" ON "event_document" USING btree ("event_id","type");