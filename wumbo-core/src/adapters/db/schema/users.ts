import { text, timestamp, uuid, pgTable, uniqueIndex } from "drizzle-orm/pg-core";

import type { UserStatus } from "../../../domain/entities/user";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    cognitoSubject: text("cognito_subject").notNull(),
    email: text("email"),
    status: text("status").$type<UserStatus>().notNull().default("active"),
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
    cognitoSubjectUnique: uniqueIndex("users_cognito_subject_idx").on(table.cognitoSubject),
  }),
);

export type UserRow = typeof users.$inferSelect;
