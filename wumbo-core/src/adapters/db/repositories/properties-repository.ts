import { and, eq } from "drizzle-orm";
import type { Database } from "../client/connection";
import { properties } from "../schema";
import { ConflictError } from "../../../domain/errors/conflict-error";
import type { PropertiesRepository, CreatePropertyInput, UpdatePropertyInput } from "../../../domain/ports/properties-repository";
import type { Property } from "../../../domain/entities/property";

export function createPropertiesRepository(db: Database): PropertiesRepository {
  return {
    async findBySlug(slug: string): Promise<Property | null> {
      const row = await db.query.properties.findFirst({
        where: eq(properties.slug, slug),
      });

      return row ? mapProperty(row) : null;
    },

    async findById(id: string): Promise<Property | null> {
      const row = await db.query.properties.findFirst({
        where: eq(properties.id, id),
      });

      return row ? mapProperty(row) : null;
    },

    async findPublicBySlug(slug: string): Promise<Property | null> {
      const row = await db.query.properties.findFirst({
        where: and(eq(properties.slug, slug), eq(properties.visibility, "public")),
      });

      return row ? mapProperty(row) : null;
    },

    async create(input: CreatePropertyInput): Promise<Property> {
      try {
        const [row] = await db
          .insert(properties)
          .values({
            id: input.id,
            ownerUserId: input.ownerUserId,
            slug: input.slug,
            title: input.title,
            description: input.description,
            visibility: input.visibility,
          })
          .returning();

        if (!row) {
          throw new Error("Expected property create to return a row.");
        }

        return mapProperty(row);
      } catch (error) {
        throw translateUniqueConstraint(error, "slug is already in use.");
      }
    },

    async update(input: UpdatePropertyInput): Promise<Property> {
      try {
        const [row] = await db
          .update(properties)
          .set({
            slug: input.slug,
            title: input.title,
            description: input.description,
            visibility: input.visibility,
            updatedAt: new Date(),
          })
          .where(eq(properties.id, input.id))
          .returning();

        if (!row) {
          throw new Error("Expected property update to return a row.");
        }

        return mapProperty(row);
      } catch (error) {
        throw translateUniqueConstraint(error, "slug is already in use.");
      }
    },
  };
}

function mapProperty(row: typeof properties.$inferSelect): Property {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
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

  return error instanceof Error ? error : new Error("Unexpected property repository error.");
}
