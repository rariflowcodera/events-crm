ALTER TABLE "event" ADD COLUMN "start_time" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "end_time" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "is_single_day" boolean DEFAULT false;