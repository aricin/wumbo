import type { DomainEvent } from "../../events/domain-event";
import type { ClaimPendingEventsInput, EventOutbox } from "../../ports/event-outbox";
import type {
  PrivateProfilesRepository,
  UpsertPrivateProfileInput,
} from "../../ports/private-profiles-repository";
import type {
  CreatePropertyInput,
  PropertiesRepository,
  UpdatePropertyInput,
} from "../../ports/properties-repository";
import type {
  PublicProfilesRepository,
  UpsertPublicProfileInput,
} from "../../ports/public-profiles-repository";
import type { UnitOfWork, WriteContext } from "../../ports/unit-of-work";
import type {
  UpsertUserFromIdentityResult,
  UserIdentity,
  UsersRepository,
} from "../../ports/users-repository";
import type { PrivateProfile, PublicProfile } from "../../entities/profile";
import type { Property } from "../../entities/property";
import type { User } from "../../entities/user";

export function createUsersRepositoryFake(overrides: Partial<UsersRepository> = {}): UsersRepository {
  return {
    async findByCognitoSubject(): Promise<User | null> {
      return null;
    },
    async upsertFromIdentity(identity: UserIdentity): Promise<UpsertUserFromIdentityResult> {
      return {
        user: {
          id: "user-1",
          cognitoSubject: identity.subject,
          email: identity.email,
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        created: true,
        emailUpdated: false,
      };
    },
    ...overrides,
  };
}

export function createPublicProfilesRepositoryFake(
  overrides: Partial<PublicProfilesRepository> = {},
): PublicProfilesRepository {
  return {
    async findByHandle(): Promise<PublicProfile | null> {
      return null;
    },
    async findByUserId(): Promise<PublicProfile | null> {
      return null;
    },
    async upsertForUser(input: UpsertPublicProfileInput): Promise<PublicProfile> {
      return {
        userId: input.userId,
        handle: input.handle,
        displayName: input.displayName,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    },
    ...overrides,
  };
}

export function createPrivateProfilesRepositoryFake(
  overrides: Partial<PrivateProfilesRepository> = {},
): PrivateProfilesRepository {
  return {
    async findByUserId(): Promise<PrivateProfile | null> {
      return null;
    },
    async upsertForUser(input: UpsertPrivateProfileInput): Promise<PrivateProfile> {
      return {
        userId: input.userId,
        legalName: input.legalName,
        phoneNumber: input.phoneNumber,
        contactEmail: input.contactEmail,
        city: input.city,
        stateRegion: input.stateRegion,
        countryCode: input.countryCode,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    },
    ...overrides,
  };
}

export function createPropertiesRepositoryFake(
  overrides: Partial<PropertiesRepository> = {},
): PropertiesRepository {
  return {
    async findBySlug(): Promise<Property | null> {
      return null;
    },
    async findById(): Promise<Property | null> {
      return null;
    },
    async findPublicBySlug(): Promise<Property | null> {
      return null;
    },
    async create(input: CreatePropertyInput): Promise<Property> {
      return {
        id: input.id,
        ownerUserId: input.ownerUserId,
        slug: input.slug,
        title: input.title,
        description: input.description,
        visibility: input.visibility,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    },
    async update(input: UpdatePropertyInput): Promise<Property> {
      return {
        id: input.id,
        ownerUserId: "user-1",
        slug: input.slug ?? "property-slug",
        title: input.title ?? "Property Title",
        description: input.description ?? "Property description",
        visibility: input.visibility ?? "public",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    },
    ...overrides,
  };
}

export function createEventOutboxFake(
  overrides: Partial<EventOutbox> = {},
): EventOutbox & { enqueuedEvents: DomainEvent[]; claimInputs: ClaimPendingEventsInput[] } {
  const enqueuedEvents: DomainEvent[] = [];
  const claimInputs: ClaimPendingEventsInput[] = [];

  return {
    enqueuedEvents,
    claimInputs,
    async enqueue(event: DomainEvent): Promise<void> {
      enqueuedEvents.push(event);
    },
    async claimPending(input: ClaimPendingEventsInput): Promise<never[]> {
      claimInputs.push(input);
      return [];
    },
    async markPublished(_eventId: string, _claimToken: string, _nextAttemptCount: number): Promise<void> {},
    async markFailed(
      _eventId: string,
      _claimToken: string,
      _nextAttemptCount: number,
      _errorMessage: string,
    ): Promise<void> {},
    ...overrides,
  };
}

export function createWriteContextFake(overrides: Partial<WriteContext> = {}): WriteContext {
  return {
    users: createUsersRepositoryFake(),
    publicProfiles: createPublicProfilesRepositoryFake(),
    privateProfiles: createPrivateProfilesRepositoryFake(),
    properties: createPropertiesRepositoryFake(),
    eventOutbox: createEventOutboxFake(),
    ...overrides,
  };
}

export function createUnitOfWorkFake(
  context: WriteContext,
): UnitOfWork & { lastContext?: WriteContext } {
  const fake: UnitOfWork & { lastContext?: WriteContext } = {
    async run<T>(work: (context: WriteContext) => Promise<T>): Promise<T> {
      fake.lastContext = context;
      return work(context);
    },
  };

  return fake;
}
