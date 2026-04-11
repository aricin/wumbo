import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { closePool, type Database } from "../../client/connection";
import { outboxEvents, privateProfiles, properties, publicProfiles, users } from "../../schema";
import * as schema from "../../schema";

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

let poolPromise: Promise<Pool> | undefined;
let migrationPromise: Promise<void> | undefined;

export function hasTestDatabaseConfig(): boolean {
  return Boolean(testDatabaseUrl);
}

export function requireTestDatabaseUrl(): string {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set for DB integration tests.");
  }

  return testDatabaseUrl;
}

export function configureDbTestEnv(): void {
  const connectionString = requireTestDatabaseUrl();

  process.env.DATABASE_URL = connectionString;
  process.env.DB_SSL_ENABLED ??= "false";
  delete process.env.DB_HOST;
  delete process.env.DB_PORT;
  delete process.env.DB_NAME;
  delete process.env.DB_USER;
  delete process.env.DB_PASSWORD;
  delete process.env.DB_SECRET_ARN;
}

export async function ensureTestDatabase(): Promise<NodePgDatabase<typeof schema>> {
  const pool = await getOrCreatePool();

  if (!migrationPromise) {
    migrationPromise = migrate(
      drizzle(pool, {
        schema,
      }),
      {
        migrationsFolder: "src/adapters/db/migrations",
      },
    );
  }

  await migrationPromise;

  return drizzle(pool, {
    schema,
  });
}

export async function withRollbackTransaction<T>(
  callback: (db: Database) => Promise<T>,
): Promise<T> {
  const pool = await getOrCreatePool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const db = drizzle(client, {
      schema,
    });

    return await callback(db);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

export function createTestKey(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export async function cleanupCommittedRecords(input: {
  propertyId?: string;
  propertySlug?: string;
  userId?: string;
  cognitoSubject?: string;
  outboxAggregateId?: string;
  outboxEventName?: string;
}): Promise<void> {
  const db = await ensureTestDatabase();

  if (input.outboxAggregateId || input.outboxEventName) {
    if (input.outboxAggregateId && input.outboxEventName) {
      await db
        .delete(outboxEvents)
        .where(
          and(
            eq(outboxEvents.aggregateId, input.outboxAggregateId),
            eq(outboxEvents.eventName, input.outboxEventName),
          ),
        );
    } else if (input.outboxAggregateId) {
      await db.delete(outboxEvents).where(eq(outboxEvents.aggregateId, input.outboxAggregateId));
    } else if (input.outboxEventName) {
      await db.delete(outboxEvents).where(eq(outboxEvents.eventName, input.outboxEventName));
    }
  }

  if (input.propertyId) {
    await db.delete(properties).where(eq(properties.id, input.propertyId));
  } else if (input.propertySlug) {
    await db.delete(properties).where(eq(properties.slug, input.propertySlug));
  }

  if (input.userId) {
    await db.delete(publicProfiles).where(eq(publicProfiles.userId, input.userId));
    await db.delete(privateProfiles).where(eq(privateProfiles.userId, input.userId));
    await db.delete(users).where(eq(users.id, input.userId));
  } else if (input.cognitoSubject) {
    const row = await db.query.users.findFirst({
      where: eq(users.cognitoSubject, input.cognitoSubject),
    });

    if (row) {
      await db.delete(publicProfiles).where(eq(publicProfiles.userId, row.id));
      await db.delete(privateProfiles).where(eq(privateProfiles.userId, row.id));
      await db.delete(users).where(eq(users.id, row.id));
    }
  }
}

export async function closeTestDatabase(): Promise<void> {
  await closePool();

  if (!poolPromise) {
    migrationPromise = undefined;
    return;
  }

  const pool = await poolPromise;
  await pool.end();
  poolPromise = undefined;
  migrationPromise = undefined;
}

async function getOrCreatePool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = Promise.resolve(
      new Pool({
        connectionString: requireTestDatabaseUrl(),
        max: 1,
        idleTimeoutMillis: 5_000,
        allowExitOnIdle: true,
      }),
    );
  }

  return poolPromise;
}
