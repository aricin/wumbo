import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const providerWebhookEvents = pgTable(
  "provider_webhook_events",
  {
    id: uuid("id").primaryKey(),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id").notNull(),
    eventType: text("event_type").notNull(),
    providerMessageId: text("provider_message_id"),
    payload: jsonb("payload").notNull(),
    webhookCreatedAt: timestamp("webhook_created_at", {
      withTimezone: true,
    }),
    receivedAt: timestamp("received_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
    }),
  },
  (table) => ({
    externalEventIdUnique: uniqueIndex("provider_webhook_events_external_event_id_idx").on(
      table.externalEventId,
    ),
  }),
);
