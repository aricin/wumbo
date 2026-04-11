import { eq } from "drizzle-orm";
import type { Database } from "../client/connection";
import { publicProfiles } from "../schema";
import { ConflictError } from "../../../domain/errors/conflict-error";
import type {
  PublicProfilesRepository,
  UpsertPublicProfileInput,
} from "../../../domain/ports/public-profiles-repository";
import type { PublicProfile } from "../../../domain/entities/profile";

export function createPublicProfilesRepository(db: Database): PublicProfilesRepository {
  return {
    async findByHandle(handle: string): Promise<PublicProfile | null> {
      const row = await db.query.publicProfiles.findFirst({
        where: eq(publicProfiles.handle, handle),
      });

      return row ? mapPublicProfile(row) : null;
    },

    async findByUserId(userId: string): Promise<PublicProfile | null> {
      const row = await db.query.publicProfiles.findFirst({
        where: eq(publicProfiles.userId, userId),
      });

      return row ? mapPublicProfile(row) : null;
    },

    async upsertForUser(input: UpsertPublicProfileInput): Promise<PublicProfile> {
      try {
        const [row] = await db
          .insert(publicProfiles)
          .values({
            userId: input.userId,
            handle: input.handle,
            displayName: input.displayName,
            bio: input.bio,
            avatarUrl: input.avatarUrl,
          })
          .onConflictDoUpdate({
            target: publicProfiles.userId,
            set: {
              handle: input.handle,
              displayName: input.displayName,
              bio: input.bio,
              avatarUrl: input.avatarUrl,
              updatedAt: new Date(),
            },
          })
          .returning();

        if (!row) {
          throw new Error("Expected public profile upsert to return a row.");
        }

        return mapPublicProfile(row);
      } catch (error) {
        throw translateUniqueConstraint(error, "handle is already in use.");
      }
    },
  };
}

function mapPublicProfile(row: typeof publicProfiles.$inferSelect): PublicProfile {
  return {
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function translateUniqueConstraint(error: unknown, message: string): Error {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code === "23505"
  ) {
    return new ConflictError(message);
  }

  return error instanceof Error ? error : new Error("Unexpected public profile repository error.");
}
