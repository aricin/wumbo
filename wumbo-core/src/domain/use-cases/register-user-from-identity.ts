import { ValidationError } from "../errors/validation-error";
import type { User } from "../entities/user";
import { createUserRegisteredEvent } from "../events/user-events";
import type { UnitOfWork } from "../ports/unit-of-work";

export interface RegisterUserFromIdentityInput {
  identityUserId: string;
  subject: string;
  email?: string;
}

export interface RegisterUserFromIdentityResult {
  user: User;
  created: boolean;
  emailUpdated: boolean;
}

interface RegisterUserFromIdentityUseCaseDependencies {
  unitOfWork: UnitOfWork;
}

export function createRegisterUserFromIdentityUseCase({
  unitOfWork,
}: RegisterUserFromIdentityUseCaseDependencies) {
  return async (
    input: RegisterUserFromIdentityInput,
  ): Promise<RegisterUserFromIdentityResult> => {
    const identityUserId = normalizeIdentityUserId(input.identityUserId);
    const subject = normalizeSubject(input.subject);
    const email = normalizeOptionalEmail(input.email);

    return unitOfWork.run(async (context) => {
      const result = await context.users.upsertFromIdentity({
        identityUserId,
        subject,
        email,
      });

      if (result.created) {
        await context.eventOutbox.enqueue(
          createUserRegisteredEvent({
            userId: result.user.id,
            identityUserId: result.user.identityUserId,
            cognitoSubject: result.user.cognitoSubject,
            email: result.user.email,
            status: result.user.status,
          }),
        );
      }

      return result;
    });
  };
}

function normalizeIdentityUserId(identityUserId: string): string {
  const trimmed = identityUserId.trim();

  if (trimmed.length < 1) {
    throw new ValidationError("identityUserId is required.");
  }

  return trimmed;
}

function normalizeSubject(subject: string): string {
  const trimmed = subject.trim();

  if (trimmed.length < 1) {
    throw new ValidationError("subject is required.");
  }

  return trimmed;
}

function normalizeOptionalEmail(email: string | undefined): string | undefined {
  if (!email) {
    return undefined;
  }

  const trimmed = email.trim().toLowerCase();

  return trimmed === "" ? undefined : trimmed;
}
