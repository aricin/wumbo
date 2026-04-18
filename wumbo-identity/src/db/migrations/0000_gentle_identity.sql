CREATE TABLE "users" (
  "id" uuid PRIMARY KEY NOT NULL,
  "cognito_subject" text NOT NULL,
  "email" text,
  "email_verified" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "event_name" text NOT NULL,
  "aggregate_type" text NOT NULL,
  "aggregate_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "published_at" timestamp with time zone,
  "claim_token" text,
  "claimed_at" timestamp with time zone,
  "publish_attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_cognito_subject_idx" ON "users" USING btree ("cognito_subject");
--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("published_at","claimed_at","occurred_at");
