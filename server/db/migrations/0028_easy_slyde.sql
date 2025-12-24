ALTER TABLE "guest_category" ADD COLUMN "vapp_access_code" text;--> statement-breakpoint
ALTER TABLE "guest" ADD COLUMN "serial_number" text;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_serial_number_event_idx" ON "guest" USING btree ("event_id","serial_number");