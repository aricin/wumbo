import assert from "node:assert/strict";
import test from "node:test";

import { buildIdentityUserRegisteredHandler } from "../identity-user-registered";

function buildRecord(overrides: {
  detailType?: string;
  eventId?: string;
  identityUserId?: string;
  cognitoSubject?: string;
  email?: string | null;
  emailVerified?: boolean;
} = {}) {
  return {
    messageId: "message-123",
    body: JSON.stringify({
      "detail-type": overrides.detailType ?? "identity.user.registered.v1",
      detail: {
        eventId: overrides.eventId ?? "event-123",
        data: {
          identityUserId: overrides.identityUserId ?? "identity-user-123",
          cognitoSubject: overrides.cognitoSubject ?? "subject-123",
          email: overrides.email === undefined ? "user@example.com" : overrides.email,
          emailVerified: overrides.emailVerified ?? true,
        },
      },
    }),
  };
}

test("identity registration handler sends a welcome email for verified addresses", async () => {
  const sentEvents: Array<{
    eventId: string;
    email: string;
  }> = [];
  const handler = buildIdentityUserRegisteredHandler({
    async sendWelcomeEmail(input) {
      sentEvents.push({
        eventId: input.eventId,
        email: input.email,
      });
    },
  });

  const response = await handler({
    Records: [buildRecord()],
  } as never);

  assert.deepEqual(response, { batchItemFailures: [] });
  assert.equal(sentEvents.length, 1);
  assert.equal(sentEvents[0]?.eventId, "event-123");
  assert.equal(sentEvents[0]?.email, "user@example.com");
});

test("identity registration handler skips events without an email address", async () => {
  let sendCalls = 0;
  const handler = buildIdentityUserRegisteredHandler({
    async sendWelcomeEmail() {
      sendCalls += 1;
    },
  });

  const response = await handler({
    Records: [buildRecord({ email: null })],
  } as never);

  assert.deepEqual(response, { batchItemFailures: [] });
  assert.equal(sendCalls, 0);
});

test("identity registration handler records a batch failure when sending throws", async () => {
  const handler = buildIdentityUserRegisteredHandler({
    async sendWelcomeEmail() {
      throw new Error("boom");
    },
  });

  const response = await handler({
    Records: [buildRecord()],
  } as never);

  assert.deepEqual(response, {
    batchItemFailures: [{ itemIdentifier: "message-123" }],
  });
});
