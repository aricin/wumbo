import { text, timestamp, uuid, pgTable, uniqueIndex } from "drizzle-orm/pg-core";

import type { PropertyVisibility } from "../../../domain/entities/property";
import { users } from "./users";

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    visibility: text("visibility").$type<PropertyVisibility>().notNull().default("public"),
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
    slugUnique: uniqueIndex("properties_slug_idx").on(table.slug),
  }),
);

export type PropertyRow = typeof properties.$inferSelect;
