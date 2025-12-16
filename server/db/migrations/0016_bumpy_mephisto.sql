ALTER TABLE "event" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "place_id" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "country" text;