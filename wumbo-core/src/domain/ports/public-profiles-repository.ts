import type { PublicProfile } from "../entities/profile";

export interface UpsertPublicProfileInput {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

export interface PublicProfilesRepository {
  findByHandle(handle: string): Promise<PublicProfile | null>;
  findByUserId(userId: string): Promise<PublicProfile | null>;
  upsertForUser(input: UpsertPublicProfileInput): Promise<PublicProfile>;
}
