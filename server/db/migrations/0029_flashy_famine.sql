ALTER TABLE "guest" ADD COLUMN "rsvp_short_code" text;--> statement-breakpoint
CREATE INDEX "guest_rsvp_short_code_idx" ON "guest" USING btree ("rsvp_short_code");--> statement-breakpoint
ALTER TABLE "guest" ADD CONSTRAINT "guest_rsvp_short_code_unique" UNIQUE("rsvp_short_code");