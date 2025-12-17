ALTER TABLE "guest" RENAME COLUMN "checked_in_at" TO "attended_at";--> statement-breakpoint
ALTER TABLE "guest" RENAME COLUMN "checked_in_by" TO "attended_by";--> statement-breakpoint
DROP INDEX IF EXISTS "guest_checked_in_idx";--> statement-breakpoint
CREATE INDEX "guest_attended_idx" ON "guest" ("event_id", "attended_at");
