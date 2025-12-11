CREATE TYPE "public"."suppression_reason" AS ENUM('UNKNOWN', 'HARDBOUNCE', 'SOFTBOUNCE', 'MANUAL', 'COMPLAINT', 'UNSUBSCRIBE');--> statement-breakpoint
CREATE TABLE "email_suppression" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"reason" "suppression_reason" NOT NULL,
	"error_detail" text,
	"error_source" text,
	"oci_created_at" timestamp,
	"synced_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_suppression_email_idx" ON "email_suppression" USING btree ("email");