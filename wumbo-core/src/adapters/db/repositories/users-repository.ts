import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import type { Database } from "../client/connection";
import { users } from "../schema";
import type {
  UpsertUserFromIdentityResult,
  UserIdentity,
  UsersRepository,
} from "../../../domain/ports/users-repository";
import type { User } from "../../../domain/entities/user";

export function createUsersRepository(db: Database): UsersRepository {
  return {
    async findByCognitoSubject(subject: string): Promise<User | null> {
      const row = await db.query.users.findFirst({
        where: eq(users.cognitoSubject, subject),
      });

      return row ? mapUser(row) : null;
    },

    async upsertFromIdentity(identity: UserIdentity): Promise<UpsertUserFromIdentityResult> {
      const existing = await db.query.users.findFirst({
        where: eq(users.cognitoSubject, identity.subject),
      });

      if (existing) {
        if (identity.email && identity.email !== existing.email) {
          const [updated] = await db
            .update(users)
            .set({
              email: identity.email,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id))
            .returning();

          return {
            user: mapUser(updated ?? existing),
            created: false,
            emailUpdated: true,
          };
        }

        return {
          user: mapUser(existing),
          created: false,
          emailUpdated: false,
        };
      }

      const [created] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          cognitoSubject: identity.subject,
          email: identity.email,
          status: "active",
        })
        .returning();

      if (!created) {
        throw new Error("Expected user creation to return a row.");
      }

      return {
        user: mapUser(created),
        created: true,
        emailUpdated: false,
      };
    },
  };
}

function mapUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    cognitoSubject: row.cognitoSubject,
    email: row.email ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
