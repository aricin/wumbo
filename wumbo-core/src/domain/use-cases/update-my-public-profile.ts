import { NotFoundError } from "../errors/not-found-error";
import { ValidationError } from "../errors/validation-error";
import type { IdentityActor } from "../entities/actor";
import { createPublicProfileUpdatedEvent } from "../events/profile-events";
import type { PublicProfile } from "../entities/profile";
import type { UnitOfWork } from "../ports/unit-of-work";

export interface UpdateMyPublicProfileInput {
  actor: IdentityActor;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

export interface UpdateMyPublicProfileResult {
  profile: PublicProfile;
}

interface UpdateMyPublicProfileUseCaseDependencies {
  unitOfWork: UnitOfWork;
}

export function createUpdateMyPublicProfileUseCase({
  unitOfWork,
}: UpdateMyPublicProfileUseCaseDependencies) {
  return async (
    input: UpdateMyPublicProfileInput,
  ): Promise<UpdateMyPublicProfileResult> =>
    unitOfWork.run(async (context) => {
      const user = await context.users.findByCognitoSubject(input.actor.subject);

      if (!user) {
        throw new NotFoundError("Current user has not been initialized yet.");
      }

      const profile = await context.publicProfiles.upsertForUser({
        userId: user.id,
        handle: normalizeHandle(input.handle),
        displayName: normalizeDisplayName(input.displayName),
        bio: normalizeBio(input.bio),
        avatarUrl: normalizeOptionalUrl(input.avatarUrl),
      });

      await context.eventOutbox.enqueue(
        createPublicProfileUpdatedEvent({
          userId: profile.userId,
          handle: profile.handle,
          displayName: profile.displayName,
        }),
      );

      return {
        profile,
      };
    });
}

function normalizeHandle(handle: string): string {
  const trimmed = handle.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,40}$/.test(trimmed)) {
    throw new ValidationError(
      "handle must be 3-40 characters of lowercase letters, numbers, or underscores.",
    );
  }

  return trimmed;
}

function normalizeDisplayName(displayName: string): string {
  const trimmed = displayName.trim();

  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new ValidationError("displayName must be between 1 and 80 characters.");
  }

  return trimmed;
}

function normalizeBio(bio: string): string {
  const trimmed = bio.trim();

  if (trimmed.length > 500) {
    throw new ValidationError("bio must be 500 characters or fewer.");
  }

  return trimmed;
}

function normalizeOptionalUrl(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }

  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new ValidationError("avatarUrl must be a valid http or https URL.");
  }

  return trimmed;
}
