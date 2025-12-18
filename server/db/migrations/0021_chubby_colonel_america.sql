ALTER TABLE "bulk_email_job" DROP CONSTRAINT "bulk_email_job_template_id_email_template_id_fk";
--> statement-breakpoint
ALTER TABLE "bulk_email_job" ALTER COLUMN "template_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bulk_email_job" ADD CONSTRAINT "bulk_email_job_template_id_email_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_template"("id") ON DELETE set null ON UPDATE no action;
