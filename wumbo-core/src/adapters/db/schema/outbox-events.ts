import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export interface OutboxPayload {
  [key: string]: unknown;
}

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey(),
    eventName: text("event_name").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<OutboxPayload>().notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
    }).notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
    }),
    claimToken: text("claim_token"),
    claimedAt: timestamp("claimed_at", {
      withTimezone: true,
    }),
    publishAttempts: integer("publish_attempts").default(0).notNull(),
    lastError: text("last_error"),
  },
  (table) => ({
    pendingLookup: index("outbox_events_pending_idx").on(
      table.publishedAt,
      table.claimedAt,
      table.occurredAt,
    ),
  }),
);

export type OutboxEventRow = typeof outboxEvents.$inferSelect;
