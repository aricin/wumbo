import { withTransaction } from "./client/connection";
import type { UnitOfWork, WriteContext } from "../../domain/ports/unit-of-work";
import { createDbRepositories } from "./db-dependencies";

export const dbUnitOfWork: UnitOfWork = {
  async run<T>(work: (context: WriteContext) => Promise<T>): Promise<T> {
    return withTransaction(async (db) => work(createDbRepositories(db)));
  },
};
