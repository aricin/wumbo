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
      const existingByIdentityUserId = await db.query.users.findFirst({
        where: eq(users.identityUserId, identity.identityUserId),
      });
      const existingBySubject = await db.query.users.findFirst({
        where: eq(users.cognitoSubject, identity.subject),
      });
      const existing =
        existingByIdentityUserId && existingBySubject
          ? ensureMatchingUser(existingByIdentityUserId, existingBySubject, identity)
          : existingByIdentityUserId ?? existingBySubject;

      if (existing) {
        const nextEmail = identity.email ?? existing.email ?? null;
        const emailUpdated = nextEmail !== existing.email;
        const identityUpdated =
          existing.identityUserId !== identity.identityUserId ||
          existing.cognitoSubject !== identity.subject;

        if (emailUpdated || identityUpdated) {
          const [updated] = await db
            .update(users)
            .set({
              identityUserId: identity.identityUserId,
              cognitoSubject: identity.subject,
              email: nextEmail,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.id))
            .returning();

          return {
            user: mapUser(updated ?? existing),
            created: false,
            emailUpdated,
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
          identityUserId: identity.identityUserId,
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
    identityUserId: row.identityUserId ?? undefined,
    cognitoSubject: row.cognitoSubject,
    email: row.email ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function ensureMatchingUser(
  existingByIdentityUserId: typeof users.$inferSelect,
  existingBySubject: typeof users.$inferSelect,
  identity: UserIdentity,
): typeof users.$inferSelect {
  if (existingByIdentityUserId.id !== existingBySubject.id) {
    throw new Error(
      `Conflicting core users found for identityUserId ${identity.identityUserId} and subject ${identity.subject}.`,
    );
  }

  return existingByIdentityUserId;
}
