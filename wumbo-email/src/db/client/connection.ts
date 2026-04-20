import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "../schema";
import {
  readBooleanEnv,
  readIntegerEnv,
  readOptionalEnv,
} from "../../shared/config/env";
import { getSecretString } from "../../shared/aws/secrets";

interface DatabaseSettings {
  connectionString?: string;
  host?: string;
  port: number;
  database?: string;
  user?: string;
  password?: string;
  secretArn?: string;
  sslEnabled: boolean;
}

let poolPromise: Promise<Pool> | undefined;
let dbPromise: Promise<Database> | undefined;

export type Database = NodePgDatabase<typeof schema>;

export async function getPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = createPool();
  }

  return poolPromise;
}

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = createDb();
  }

  return dbPromise;
}

export async function closePool(): Promise<void> {
  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  await pool.end();
  poolPromise = undefined;
  dbPromise = undefined;
}

export async function pingDatabase(): Promise<void> {
  const db = await getDb();
  await db.execute(sql`select 1`);
}

async function createPool(): Promise<Pool> {
  const poolConfig = await buildPoolConfig();

  return new Pool(poolConfig);
}

async function createDb(): Promise<Database> {
  const pool = await getPool();

  return drizzle(pool, {
    schema,
  });
}

async function buildPoolConfig(): Promise<PoolConfig> {
  const settings = readDatabaseSettingsFromEnv();

  if (settings.connectionString) {
    return {
      connectionString: settings.connectionString,
      max: 1,
      idleTimeoutMillis: 5_000,
      allowExitOnIdle: true,
      ssl: settings.sslEnabled ? { rejectUnauthorized: false } : undefined,
    };
  }

  const host = settings.host;
  const database = settings.database;
  const user = settings.user;
  const password = await resolveDatabasePassword(settings);

  if (!host || !database || !user || !password) {
    throw new Error("Database connection information is incomplete.");
  }

  return {
    host,
    port: settings.port,
    database,
    user,
    password,
    max: 1,
    idleTimeoutMillis: 5_000,
    allowExitOnIdle: true,
    ssl: settings.sslEnabled ? { rejectUnauthorized: false } : undefined,
  };
}

function readDatabaseSettingsFromEnv(): DatabaseSettings {
  return {
    connectionString: readOptionalEnv("DATABASE_URL"),
    host: readOptionalEnv("DB_HOST"),
    port: readIntegerEnv("DB_PORT", 5432),
    database: readOptionalEnv("DB_NAME"),
    user: readOptionalEnv("DB_USER"),
    password: readOptionalEnv("DB_PASSWORD"),
    secretArn: readOptionalEnv("DB_SECRET_ARN"),
    sslEnabled: readBooleanEnv("DB_SSL_ENABLED", true),
  };
}

async function resolveDatabasePassword(
  settings: DatabaseSettings,
): Promise<string | undefined> {
  if (settings.password) {
    return settings.password;
  }

  if (!settings.secretArn) {
    return undefined;
  }

  return extractPassword(await getSecretString(settings.secretArn));
}

function extractPassword(secretString: string): string {
  try {
    const parsed = JSON.parse(secretString) as Record<string, unknown>;

    if (typeof parsed.password === "string" && parsed.password.trim() !== "") {
      return parsed.password.trim();
    }
  } catch {
    return secretString.trim();
  }

  return secretString.trim();
}
