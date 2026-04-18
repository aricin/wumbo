import assert from "node:assert/strict";
import test from "node:test";
import type { PostConfirmationTriggerEvent } from "aws-lambda";

import { buildPostConfirmationHandler } from "./post-confirmation";

test("postConfirmation handler translates Cognito attributes into registerConfirmedUser input", async () => {
  const capturedInputs: unknown[] = [];
  const handler = buildPostConfirmationHandler({
    async registerConfirmedUser(input) {
      capturedInputs.push(input);
    },
  });

  const event = createPostConfirmationEvent({
    sub: "cognito-sub-123",
    email: "User@example.com ",
    emailVerified: "true",
  });

  const result = await handler(event);

  assert.equal(result, event);
  assert.deepEqual(capturedInputs, [
    {
      subject: "cognito-sub-123",
      email: "User@example.com",
      emailVerified: true,
    },
  ]);
});

test("postConfirmation handler rejects events without a Cognito subject", async () => {
  const handler = buildPostConfirmationHandler({
    async registerConfirmedUser() {
      throw new Error("registerConfirmedUser should not be called.");
    },
  });

  await assert.rejects(
    () =>
      handler(
        createPostConfirmationEvent({
          sub: "   ",
        }),
      ),
    /PostConfirmation event is missing userAttributes\.sub\./,
  );
});

function createPostConfirmationEvent(
  overrides: Partial<Record<string, string>> = {},
): PostConfirmationTriggerEvent {
  return {
    version: "1",
    region: "us-west-2",
    userPoolId: "us-west-2_example",
    userName: overrides.sub ?? "cognito-sub-123",
    triggerSource: "PostConfirmation_ConfirmSignUp",
    callerContext: {
      awsSdkVersion: "3.x",
      clientId: "client-123",
    },
    request: {
      userAttributes: {
        sub: "cognito-sub-123",
        email: "user@example.com",
        email_verified: "false",
        ...overrides,
      },
      clientMetadata: undefined,
    },
    response: {},
  };
}
