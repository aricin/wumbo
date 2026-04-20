import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { emailDeliveries } from "./email-deliveries";

export const promotionalUnsubscribes = pgTable("promotional_unsubscribes", {
  email: text("email").primaryKey(),
  source: text("source").notNull(),
  reason: text("reason"),
  deliveryId: uuid("delivery_id").references(() => emailDeliveries.id, {
    onDelete: "set null",
  }),
  unsubscribedAt: timestamp("unsubscribed_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
