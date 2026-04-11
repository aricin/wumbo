import type { Database } from "./client/connection";
import { createEventOutbox } from "./repositories/event-outbox";
import { createPrivateProfilesRepository } from "./repositories/private-profiles-repository";
import { createPropertiesRepository } from "./repositories/properties-repository";
import { createPublicProfilesRepository } from "./repositories/public-profiles-repository";
import { createUsersRepository } from "./repositories/users-repository";

export function createDbRepositories(db: Database) {
  return {
    users: createUsersRepository(db),
    publicProfiles: createPublicProfilesRepository(db),
    privateProfiles: createPrivateProfilesRepository(db),
    properties: createPropertiesRepository(db),
    eventOutbox: createEventOutbox(db),
  };
}
