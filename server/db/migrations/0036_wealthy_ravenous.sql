ALTER TABLE "guest" ADD COLUMN "reference_number" text;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_reference_number_event_idx" ON "guest" USING btree ("event_id","reference_number");