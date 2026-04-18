import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import type { Database } from "../connection";
import { users } from "../schema";

export interface IdentityUser {
  id: string;
  cognitoSubject: string;
  email?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CognitoIdentityInput {
  subject: string;
  email?: string;
  emailVerified: boolean;
}

export interface UpsertUserFromCognitoResult {
  user: IdentityUser;
  created: boolean;
  emailUpdated: boolean;
  emailVerifiedUpdated: boolean;
}

export function createUsersRepository(db: Database) {
  return {
    async findByCognitoSubject(subject: string): Promise<IdentityUser | null> {
      const row = await db.query.users.findFirst({
        where: eq(users.cognitoSubject, subject),
      });

      return row ? mapIdentityUser(row) : null;
    },

    async upsertFromCognito(
      identity: CognitoIdentityInput,
    ): Promise<UpsertUserFromCognitoResult> {
      const existing = await db.query.users.findFirst({
        where: eq(users.cognitoSubject, identity.subject),
      });

      if (existing) {
        const nextEmail = identity.email ?? existing.email ?? null;
        const emailUpdated = nextEmail !== existing.email;
        const emailVerifiedUpdated = identity.emailVerified !== existing.emailVerified;

        if (!emailUpdated && !emailVerifiedUpdated) {
          return {
            user: mapIdentityUser(existing),
            created: false,
            emailUpdated: false,
            emailVerifiedUpdated: false,
          };
        }

        const [updated] = await db
          .update(users)
          .set({
            email: nextEmail,
            emailVerified: identity.emailVerified,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning();

        return {
          user: mapIdentityUser(updated ?? existing),
          created: false,
          emailUpdated,
          emailVerifiedUpdated,
        };
      }

      const [created] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          cognitoSubject: identity.subject,
          email: identity.email,
          emailVerified: identity.emailVerified,
        })
        .returning();

      if (!created) {
        throw new Error("Expected identity user creation to return a row.");
      }

      return {
        user: mapIdentityUser(created),
        created: true,
        emailUpdated: false,
        emailVerifiedUpdated: false,
      };
    },
  };
}

function mapIdentityUser(row: typeof users.$inferSelect): IdentityUser {
  return {
    id: row.id,
    cognitoSubject: row.cognitoSubject,
    email: row.email ?? undefined,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
