CREATE TABLE "email_preview_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"guest_id" text NOT NULL,
	"template_id" text NOT NULL,
	"event_id" text NOT NULL,
	"created_by" text,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "email_preview_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "email_preview_token" ADD CONSTRAINT "email_preview_token_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preview_token" ADD CONSTRAINT "email_preview_token_template_id_email_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preview_token" ADD CONSTRAINT "email_preview_token_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preview_token" ADD CONSTRAINT "email_preview_token_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_preview_token_token_idx" ON "email_preview_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "email_preview_token_guest_idx" ON "email_preview_token" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "email_preview_token_event_idx" ON "email_preview_token" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_preview_token_guest_template_idx" ON "email_preview_token" USING btree ("guest_id","template_id");