import type { EventOutbox } from "./event-outbox";
import type { PrivateProfilesRepository } from "./private-profiles-repository";
import type { PropertiesRepository } from "./properties-repository";
import type { PublicProfilesRepository } from "./public-profiles-repository";
import type { UsersRepository } from "./users-repository";

export interface WriteContext {
  users: UsersRepository;
  publicProfiles: PublicProfilesRepository;
  privateProfiles: PrivateProfilesRepository;
  properties: PropertiesRepository;
  eventOutbox: EventOutbox;
}

export interface UnitOfWork {
  run<T>(work: (context: WriteContext) => Promise<T>): Promise<T>;
}
