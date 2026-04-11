import "dotenv/config";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { closePool, getDb } from "./client/connection";

async function main(): Promise<void> {
  const db = await getDb();

  await migrate(db, {
    migrationsFolder: "src/adapters/db/migrations",
  });

  console.log("Database migrations applied.");
}

main()
  .catch((error) => {
    console.error("Database migration run failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
