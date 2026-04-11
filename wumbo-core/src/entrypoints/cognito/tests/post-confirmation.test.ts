import assert from "node:assert/strict";
import test from "node:test";

import type { RegisterUserFromIdentityInput } from "../../../domain/use-cases/register-user-from-identity";
import { buildPostConfirmationHandler } from "../post-confirmation";

function createPostConfirmationEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    version: "1",
    region: "us-west-2",
    userPoolId: "us-west-2_example",
    userName: "user-name",
    triggerSource: "PostConfirmation_ConfirmSignUp",
    callerContext: {
      awsSdkVersion: "3.x",
      clientId: "client-id",
    },
    request: {
      userAttributes: {
        sub: "subject-123",
        email: "user@example.com",
      },
      clientMetadata: {},
    },
    response: {},
    ...overrides,
  };
}

test("post-confirmation handler passes identity data to the registration use case", async () => {
  const calls: RegisterUserFromIdentityInput[] = [];
  const handler = buildPostConfirmationHandler({
    createRegisterUserFromIdentityUseCase: () => {
      return async (input: RegisterUserFromIdentityInput) => {
        calls.push(input);

        return {
          user: {
            id: "user-123",
            cognitoSubject: input.subject,
            email: input.email,
            status: "active" as const,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          created: true,
          emailUpdated: false,
        };
      };
    },
    unitOfWork: {} as never,
  });
  const event = createPostConfirmationEvent({
    request: {
      userAttributes: {
        sub: " subject-123 ",
        email: " USER@EXAMPLE.COM ",
      },
      clientMetadata: {},
    },
  });

  const result = await handler(event as never);

  assert.equal(result, event);
  assert.deepEqual(calls, [
    {
      subject: "subject-123",
      email: "USER@EXAMPLE.COM",
    },
  ]);
});

test("post-confirmation handler throws when the Cognito subject is missing", async () => {
  const handler = buildPostConfirmationHandler({
    createRegisterUserFromIdentityUseCase: () => {
      throw new Error("createRegisterUserFromIdentityUseCase should not be called without a subject.");
    },
    unitOfWork: {} as never,
  });

  await assert.rejects(
    () =>
      handler(
        createPostConfirmationEvent({
          request: {
            userAttributes: {
              email: "user@example.com",
            },
            clientMetadata: {},
          },
        }) as never,
      ),
    /PostConfirmation event is missing userAttributes\.sub\./,
  );
});
