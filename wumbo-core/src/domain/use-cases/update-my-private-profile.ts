import { NotFoundError } from "../errors/not-found-error";
import { ValidationError } from "../errors/validation-error";
import type { IdentityActor } from "../entities/actor";
import { createPrivateProfileUpdatedEvent } from "../events/profile-events";
import type { PrivateProfile } from "../entities/profile";
import type { UnitOfWork } from "../ports/unit-of-work";

export interface UpdateMyPrivateProfileInput {
  actor: IdentityActor;
  legalName?: string;
  phoneNumber?: string;
  contactEmail?: string;
  city?: string;
  stateRegion?: string;
  countryCode?: string;
}

export interface UpdateMyPrivateProfileResult {
  profile: PrivateProfile;
}

interface UpdateMyPrivateProfileUseCaseDependencies {
  unitOfWork: UnitOfWork;
}

export function createUpdateMyPrivateProfileUseCase({
  unitOfWork,
}: UpdateMyPrivateProfileUseCaseDependencies) {
  return async (
    input: UpdateMyPrivateProfileInput,
  ): Promise<UpdateMyPrivateProfileResult> =>
    unitOfWork.run(async (context) => {
      const user = await context.users.findByCognitoSubject(input.actor.subject);

      if (!user) {
        throw new NotFoundError("Current user has not been initialized yet.");
      }

      const profile = await context.privateProfiles.upsertForUser({
        userId: user.id,
        legalName: normalizeOptionalString(input.legalName, "legalName", 120),
        phoneNumber: normalizeOptionalString(input.phoneNumber, "phoneNumber", 32),
        contactEmail: normalizeOptionalEmail(input.contactEmail),
        city: normalizeOptionalString(input.city, "city", 80),
        stateRegion: normalizeOptionalString(input.stateRegion, "stateRegion", 80),
        countryCode: normalizeOptionalCountryCode(input.countryCode),
      });

      await context.eventOutbox.enqueue(
        createPrivateProfileUpdatedEvent({
          userId: profile.userId,
        }),
      );

      return {
        profile,
      };
    });
}

function normalizeOptionalString(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): string | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

function normalizeOptionalEmail(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new ValidationError("contactEmail must be a valid email address.");
  }

  return trimmed;
}

function normalizeOptionalCountryCode(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }

  const trimmed = value.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(trimmed)) {
    throw new ValidationError("countryCode must be a two-letter country code.");
  }

  return trimmed;
}
