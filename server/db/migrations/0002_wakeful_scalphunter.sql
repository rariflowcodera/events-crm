ALTER TABLE "event" ADD COLUMN "custom_domain_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "custom_domain_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "custom_domain_verification_token" text;--> statement-breakpoint
CREATE INDEX "event_custom_domain_idx" ON "event" USING btree ("custom_domain");