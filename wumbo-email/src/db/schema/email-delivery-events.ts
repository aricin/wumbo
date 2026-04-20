import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { emailDeliveries } from "./email-deliveries";

export const emailDeliveryEvents = pgTable(
  "email_delivery_events",
  {
    id: uuid("id").primaryKey(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => emailDeliveries.id, {
        onDelete: "cascade",
      }),
    eventType: text("event_type").notNull(),
    eventSource: text("event_source").notNull(),
    statusAfterEvent: text("status_after_event"),
    externalEventId: text("external_event_id"),
    payload: jsonb("payload"),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    externalEventIdUnique: uniqueIndex("email_delivery_events_external_event_id_idx").on(
      table.externalEventId,
    ),
  }),
);
