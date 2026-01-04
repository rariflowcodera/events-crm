-- First, convert existing text data to JSON format
UPDATE "event_form" SET
  "name" = jsonb_build_object('en', "name")::json
WHERE "name" IS NOT NULL AND "name"::text NOT LIKE '{%';

UPDATE "event_form" SET
  "description" = jsonb_build_object('en', "description")::json
WHERE "description" IS NOT NULL AND "description"::text NOT LIKE '{%';

-- Then change the column types
ALTER TABLE "event_form" ALTER COLUMN "name" SET DATA TYPE json USING "name"::json;--> statement-breakpoint
ALTER TABLE "event_form" ALTER COLUMN "description" SET DATA TYPE json USING "description"::json;
