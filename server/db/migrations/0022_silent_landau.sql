CREATE TABLE "guest_form_token" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"form_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "guest_form_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "guest_form_token" ADD CONSTRAINT "guest_form_token_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_form_token" ADD CONSTRAINT "guest_form_token_form_id_event_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."event_form"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_form_token_guest_idx" ON "guest_form_token" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_form_token_form_idx" ON "guest_form_token" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "guest_form_token_token_idx" ON "guest_form_token" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_form_token_guest_form_idx" ON "guest_form_token" USING btree ("guest_id","form_id");