ALTER TABLE "outbox_events" ADD COLUMN "claim_token" text;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("published_at","claimed_at","occurred_at");