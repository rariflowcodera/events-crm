ALTER TABLE "guest" ADD COLUMN "checked_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "guest" ADD COLUMN "checked_in_by" text;--> statement-breakpoint
ALTER TABLE "guest" ADD CONSTRAINT "guest_checked_in_by_user_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_checked_in_idx" ON "guest" USING btree ("event_id","checked_in_at");