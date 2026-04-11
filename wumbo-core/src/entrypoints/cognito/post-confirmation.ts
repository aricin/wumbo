import type {
  PostConfirmationTriggerEvent,
  PostConfirmationTriggerHandler,
} from "aws-lambda";

import { dbUnitOfWork } from "../../adapters/db/unit-of-work";
import { createRegisterUserFromIdentityUseCase } from "../../domain/use-cases/register-user-from-identity";

interface PostConfirmationHandlerDependencies {
  createRegisterUserFromIdentityUseCase: typeof createRegisterUserFromIdentityUseCase;
  unitOfWork: typeof dbUnitOfWork;
}

type PostConfirmationHandlerFunction = (
  event: PostConfirmationTriggerEvent,
) => Promise<PostConfirmationTriggerEvent>;

export function buildPostConfirmationHandler({
  createRegisterUserFromIdentityUseCase,
  unitOfWork,
}: PostConfirmationHandlerDependencies): PostConfirmationHandlerFunction {
  return async function handler(
    event: PostConfirmationTriggerEvent,
  ): Promise<PostConfirmationTriggerEvent> {
    const subject = event.request.userAttributes.sub?.trim();

    if (!subject) {
      throw new Error("PostConfirmation event is missing userAttributes.sub.");
    }

    const registerUserFromIdentity = createRegisterUserFromIdentityUseCase({
      unitOfWork,
    });

    await registerUserFromIdentity({
      subject,
      email: normalizeOptionalValue(event.request.userAttributes.email),
    });

    return event;
  };
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

const postConfirmationHandler = buildPostConfirmationHandler({
  createRegisterUserFromIdentityUseCase,
  unitOfWork: dbUnitOfWork,
});

export const handler: PostConfirmationTriggerHandler = async (event) =>
  postConfirmationHandler(event);
