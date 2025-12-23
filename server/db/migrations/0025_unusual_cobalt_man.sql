CREATE TYPE "public"."guest_gender" AS ENUM('male', 'female', 'unspecified');--> statement-breakpoint
ALTER TABLE "guest" ADD COLUMN "gender" "guest_gender" DEFAULT 'unspecified';