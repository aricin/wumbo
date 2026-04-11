import type { DomainActor, IdentityActor } from "../../entities/actor";
import type { PrivateProfile, PublicProfile } from "../../entities/profile";
import type { Property } from "../../entities/property";
import type { User } from "../../entities/user";

const DEFAULT_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export function createIdentityActor(overrides: Partial<IdentityActor> = {}): IdentityActor {
  return {
    subject: "user-subject-1",
    source: "jwt",
    email: "user@example.com",
    groups: [],
    ...overrides,
  };
}

export function createDomainActor(overrides: Partial<DomainActor> = {}): DomainActor {
  return {
    userId: "user-1",
    ...createIdentityActor(),
    ...overrides,
  };
}

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    cognitoSubject: "user-subject-1",
    email: "user@example.com",
    status: "active",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function createPublicProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    userId: "user-1",
    handle: "wumbo_user",
    displayName: "Wumbo User",
    bio: "Hello from Wumbo.",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function createPrivateProfile(overrides: Partial<PrivateProfile> = {}): PrivateProfile {
  return {
    userId: "user-1",
    contactEmail: "user@example.com",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function createProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "property-1",
    ownerUserId: "user-1",
    slug: "wumbo-property",
    title: "Wumbo Property",
    description: "A test property.",
    visibility: "public",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}
