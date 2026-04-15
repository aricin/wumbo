import "dotenv/config";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/adapters/db/schema/index.ts",
  out: "./src/adapters/db/migrations",
  dbCredentials: {
    url: buildDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});

function buildDatabaseUrl() {
  const directUrl = process.env.DATABASE_URL?.trim();

  if (directUrl) {
    return directUrl;
  }

  const host = requireEnv("DB_HOST");
  const port = requireEnv("DB_PORT");
  const database = requireEnv("DB_NAME");
  const user = requireEnv("DB_USER");
  const password = requireEnv("DB_PASSWORD");
  const sslEnabled = (process.env.DB_SSL_ENABLED ?? "true").trim() === "true";

  const url = new URL(`postgresql://${host}`);
  url.port = port;
  url.pathname = `/${database}`;
  url.username = user;
  url.password = password;
  url.searchParams.set("sslmode", sslEnabled ? "require" : "disable");

  return url.toString();
}

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
