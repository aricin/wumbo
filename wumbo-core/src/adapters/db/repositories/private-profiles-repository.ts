import { eq } from "drizzle-orm";
import type { Database } from "../client/connection";
import { privateProfiles } from "../schema";
import type {
  PrivateProfilesRepository,
  UpsertPrivateProfileInput,
} from "../../../domain/ports/private-profiles-repository";
import type { PrivateProfile } from "../../../domain/entities/profile";

export function createPrivateProfilesRepository(db: Database): PrivateProfilesRepository {
  return {
    async findByUserId(userId: string): Promise<PrivateProfile | null> {
      const row = await db.query.privateProfiles.findFirst({
        where: eq(privateProfiles.userId, userId),
      });

      return row ? mapPrivateProfile(row) : null;
    },

    async upsertForUser(input: UpsertPrivateProfileInput): Promise<PrivateProfile> {
      const [row] = await db
        .insert(privateProfiles)
        .values({
          userId: input.userId,
          legalName: input.legalName,
          phoneNumber: input.phoneNumber,
          contactEmail: input.contactEmail,
          city: input.city,
          stateRegion: input.stateRegion,
          countryCode: input.countryCode,
        })
        .onConflictDoUpdate({
          target: privateProfiles.userId,
          set: {
            legalName: input.legalName,
            phoneNumber: input.phoneNumber,
            contactEmail: input.contactEmail,
            city: input.city,
            stateRegion: input.stateRegion,
            countryCode: input.countryCode,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!row) {
        throw new Error("Expected private profile upsert to return a row.");
      }

      return mapPrivateProfile(row);
    },
  };
}

function mapPrivateProfile(row: typeof privateProfiles.$inferSelect): PrivateProfile {
  return {
    userId: row.userId,
    legalName: row.legalName ?? undefined,
    phoneNumber: row.phoneNumber ?? undefined,
    contactEmail: row.contactEmail ?? undefined,
    city: row.city ?? undefined,
    stateRegion: row.stateRegion ?? undefined,
    countryCode: row.countryCode ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
