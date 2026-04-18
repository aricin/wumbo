import assert from "node:assert/strict";
import test from "node:test";

import { buildRegisterConfirmedUser } from "./register-confirmed-user";

test("registerConfirmedUser normalizes Cognito input and enqueues a registration event for new users", async () => {
  const capturedInputs: Array<{
    subject: string;
    email?: string;
    emailVerified: boolean;
  }> = [];
  const enqueuedEvents: Array<{
    eventName: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }> = [];

  const registerConfirmedUser = buildRegisterConfirmedUser({
    async runInTransaction(work) {
      return work({
        users: {
          async upsertFromCognito(input) {
            capturedInputs.push(input);

            return {
              user: {
                id: "identity-user-123",
                cognitoSubject: input.subject,
                email: input.email,
                emailVerified: input.emailVerified,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
              created: true,
              emailUpdated: false,
              emailVerifiedUpdated: false,
            };
          },
        },
        outbox: {
          async enqueue(event) {
            enqueuedEvents.push(event);
          },
        },
      });
    },
  });

  const result = await registerConfirmedUser({
    subject: " cognito-sub-123 ",
    email: " USER@EXAMPLE.COM ",
    emailVerified: true,
  });

  assert.deepEqual(capturedInputs, [
    {
      subject: "cognito-sub-123",
      email: "user@example.com",
      emailVerified: true,
    },
  ]);
  assert.equal(result.created, true);
  assert.equal(enqueuedEvents.length, 1);
  assert.equal(enqueuedEvents[0]?.eventName, "identity.user.registered.v1");
  assert.equal(enqueuedEvents[0]?.aggregateType, "identity-user");
  assert.equal(enqueuedEvents[0]?.aggregateId, "identity-user-123");
  assert.deepEqual(enqueuedEvents[0]?.payload, {
    identityUserId: "identity-user-123",
    cognitoSubject: "cognito-sub-123",
    email: "user@example.com",
    emailVerified: true,
  });
});

test("registerConfirmedUser does not enqueue an event when the identity user already exists", async () => {
  const enqueuedEvents: unknown[] = [];

  const registerConfirmedUser = buildRegisterConfirmedUser({
    async runInTransaction(work) {
      return work({
        users: {
          async upsertFromCognito(input) {
            return {
              user: {
                id: "identity-user-123",
                cognitoSubject: input.subject,
                email: input.email,
                emailVerified: input.emailVerified,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
              created: false,
              emailUpdated: true,
              emailVerifiedUpdated: false,
            };
          },
        },
        outbox: {
          async enqueue(event) {
            enqueuedEvents.push(event);
          },
        },
      });
    },
  });

  const result = await registerConfirmedUser({
    subject: "cognito-sub-123",
    email: "updated@example.com",
    emailVerified: true,
  });

  assert.equal(result.created, false);
  assert.equal(result.emailUpdated, true);
  assert.equal(enqueuedEvents.length, 0);
});

test("registerConfirmedUser rejects a blank subject before opening a transaction", async () => {
  let transactionCalls = 0;

  const registerConfirmedUser = buildRegisterConfirmedUser({
    async runInTransaction() {
      transactionCalls += 1;
      throw new Error("Transaction should not run when subject is blank.");
    },
  });

  await assert.rejects(
    () =>
      registerConfirmedUser({
        subject: "   ",
        emailVerified: false,
      }),
    /subject is required\./,
  );

  assert.equal(transactionCalls, 0);
});
