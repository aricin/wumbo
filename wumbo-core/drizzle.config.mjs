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

  const host = process.env.DB_HOST?.trim() || "127.0.0.1";
  const port = process.env.DB_PORT?.trim() ?? "5432";
  const database = process.env.DB_NAME?.trim() || "wumbo";
  const user = process.env.DB_USER?.trim() || "wumbo";
  const password = process.env.DB_PASSWORD?.trim() || "wumbo";
  const sslEnabled = (process.env.DB_SSL_ENABLED ?? "true").trim() === "true";

  const url = new URL(`postgresql://${host}`);
  url.port = port;
  url.pathname = `/${database}`;
  url.username = user;
  url.password = password;
  url.searchParams.set("sslmode", sslEnabled ? "require" : "disable");

  return url.toString();
}
