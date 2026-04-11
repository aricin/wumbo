import { text, timestamp, uuid, pgTable } from "drizzle-orm/pg-core";

import { users } from "./users";

export const privateProfiles = pgTable("private_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  legalName: text("legal_name"),
  phoneNumber: text("phone_number"),
  contactEmail: text("contact_email"),
  city: text("city"),
  stateRegion: text("state_region"),
  countryCode: text("country_code"),
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

export type PrivateProfileRow = typeof privateProfiles.$inferSelect;
