import "dotenv/config";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
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

  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim();
  const database = process.env.DB_NAME?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD?.trim();
  const sslEnabled = (process.env.DB_SSL_ENABLED ?? "true").trim() === "true";

  if (host && port && database && user && password) {
    const url = new URL(`postgresql://${host}`);
    url.port = port;
    url.pathname = `/${database}`;
    url.username = user;
    url.password = password;
    url.searchParams.set("sslmode", sslEnabled ? "require" : "disable");
    return url.toString();
  }

  return "postgresql://postgres:postgres@127.0.0.1:5432/email?sslmode=disable";
}
