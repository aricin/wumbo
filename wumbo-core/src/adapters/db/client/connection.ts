import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import { readBooleanEnv, readIntegerEnv, readOptionalEnv } from "../../../shared/config/env";
import * as schema from "../schema";

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

const secretsManagerClient = new SecretsManagerClient({});
const secretCache = new Map<string, Promise<string>>();

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

export async function withTransaction<T>(
  callback: (db: Database) => Promise<T>,
): Promise<T> {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const db = drizzle(client, {
      schema,
    });

    try {
      const result = await callback(db);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } finally {
    client.release();
  }
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

async function resolveDatabasePassword(settings: DatabaseSettings): Promise<string | undefined> {
  if (settings.password) {
    return settings.password;
  }

  if (!settings.secretArn) {
    return undefined;
  }

  let cachedSecret = secretCache.get(settings.secretArn);

  if (!cachedSecret) {
    cachedSecret = fetchSecretValue(settings.secretArn);
    secretCache.set(settings.secretArn, cachedSecret);
  }

  return cachedSecret;
}

async function fetchSecretValue(secretArn: string): Promise<string> {
  const response = await secretsManagerClient.send(
    new GetSecretValueCommand({
      SecretId: secretArn,
    }),
  );

  const secretString = response.SecretString;

  if (!secretString) {
    throw new Error(`Secret ${secretArn} does not contain a SecretString value.`);
  }

  return extractPassword(secretString);
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
