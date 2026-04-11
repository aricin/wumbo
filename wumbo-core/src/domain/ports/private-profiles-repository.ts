import type { PrivateProfile } from "../entities/profile";

export interface UpsertPrivateProfileInput {
  userId: string;
  legalName?: string;
  phoneNumber?: string;
  contactEmail?: string;
  city?: string;
  stateRegion?: string;
  countryCode?: string;
}

export interface PrivateProfilesRepository {
  findByUserId(userId: string): Promise<PrivateProfile | null>;
  upsertForUser(input: UpsertPrivateProfileInput): Promise<PrivateProfile>;
}
