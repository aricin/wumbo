import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: uuid("id").primaryKey(),
    deliveryKey: text("delivery_key").notNull(),
    emailType: text("email_type").notNull(),
    classification: text("classification").notNull(),
    sourceEventId: text("source_event_id").notNull(),
    sourceEventType: text("source_event_type").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    recipientIdentityUserId: text("recipient_identity_user_id"),
    senderProfile: text("sender_profile").notNull(),
    fromEmail: text("from_email").notNull(),
    replyToEmail: text("reply_to_email"),
    provider: text("provider").notNull().default("resend"),
    providerMessageId: text("provider_message_id"),
    unsubscribeToken: text("unsubscribe_token"),
    latestStatus: text("latest_status").notNull().default("pending"),
    latestStatusAt: timestamp("latest_status_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    skipReason: text("skip_reason"),
    sentAt: timestamp("sent_at", {
      withTimezone: true,
    }),
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
  },
  (table) => ({
    deliveryKeyUnique: uniqueIndex("email_deliveries_delivery_key_idx").on(table.deliveryKey),
    providerMessageIdUnique: uniqueIndex("email_deliveries_provider_message_id_idx").on(
      table.providerMessageId,
    ),
    unsubscribeTokenUnique: uniqueIndex("email_deliveries_unsubscribe_token_idx").on(
      table.unsubscribeToken,
    ),
  }),
);

export type EmailDeliveryRow = typeof emailDeliveries.$inferSelect;
