import { text, timestamp, uuid, pgTable, uniqueIndex } from "drizzle-orm/pg-core";

import { users } from "./users";

export const publicProfiles = pgTable(
  "public_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarUrl: text("avatar_url"),
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
    handleUnique: uniqueIndex("public_profiles_handle_idx").on(table.handle),
  }),
);

export type PublicProfileRow = typeof publicProfiles.$inferSelect;
