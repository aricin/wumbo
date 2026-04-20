CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delivery_key" text NOT NULL,
	"email_type" text NOT NULL,
	"classification" text NOT NULL,
	"source_event_id" text NOT NULL,
	"source_event_type" text NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_identity_user_id" text,
	"sender_profile" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to_email" text,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_message_id" text,
	"unsubscribe_token" text,
	"latest_status" text DEFAULT 'pending' NOT NULL,
	"latest_status_at" timestamp with time zone DEFAULT now() NOT NULL,
	"skip_reason" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_delivery_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delivery_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_source" text NOT NULL,
	"status_after_event" text,
	"external_event_id" text,
	"payload" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotional_unsubscribes" (
	"email" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"reason" text,
	"delivery_id" uuid,
	"unsubscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"external_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"provider_message_id" text,
	"payload" jsonb NOT NULL,
	"webhook_created_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "email_delivery_events" ADD CONSTRAINT "email_delivery_events_delivery_id_email_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."email_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotional_unsubscribes" ADD CONSTRAINT "promotional_unsubscribes_delivery_id_email_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."email_deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_delivery_key_idx" ON "email_deliveries" USING btree ("delivery_key");--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_provider_message_id_idx" ON "email_deliveries" USING btree ("provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_unsubscribe_token_idx" ON "email_deliveries" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE UNIQUE INDEX "email_delivery_events_external_event_id_idx" ON "email_delivery_events" USING btree ("external_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_webhook_events_external_event_id_idx" ON "provider_webhook_events" USING btree ("external_event_id");