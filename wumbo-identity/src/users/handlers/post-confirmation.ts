import type {
  PostConfirmationTriggerEvent,
  PostConfirmationTriggerHandler,
} from "aws-lambda";

import {
  buildRegisterConfirmedUser,
  type RegisterConfirmedUserInput,
} from "../register-confirmed-user";

interface PostConfirmationHandlerDependencies {
  registerConfirmedUser?: (
    input: RegisterConfirmedUserInput,
  ) => Promise<unknown>;
}

type PostConfirmationHandlerFunction = (
  event: PostConfirmationTriggerEvent,
) => Promise<PostConfirmationTriggerEvent>;

export function buildPostConfirmationHandler({
  registerConfirmedUser = buildRegisterConfirmedUser(),
}: PostConfirmationHandlerDependencies = {}): PostConfirmationHandlerFunction {
  return async function handler(
    event: PostConfirmationTriggerEvent,
  ): Promise<PostConfirmationTriggerEvent> {
    const subject = event.request.userAttributes.sub?.trim();

    if (!subject) {
      throw new Error("PostConfirmation event is missing userAttributes.sub.");
    }

    await registerConfirmedUser({
      subject,
      email: normalizeOptionalValue(event.request.userAttributes.email),
      emailVerified: normalizeBooleanValue(event.request.userAttributes.email_verified),
    });

    return event;
  };
}

const postConfirmationHandler = buildPostConfirmationHandler();

export const handler: PostConfirmationTriggerHandler = async (event) =>
  postConfirmationHandler(event);

function normalizeOptionalValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

function normalizeBooleanValue(value: string | undefined): boolean {
  return value === "true";
}
