import assert from "node:assert/strict";
import test from "node:test";

import { ValidationError } from "../errors/validation-error";
import { createRegisterUserFromIdentityUseCase } from "../use-cases/register-user-from-identity";
import {
  createEventOutboxFake,
  createUnitOfWorkFake,
  createUsersRepositoryFake,
  createWriteContextFake,
} from "./helpers/fakes";
import { createUser } from "./helpers/fixtures";

test("registerUserFromIdentity creates a user and enqueues a registration event", async () => {
  const capturedIdentities: Array<{
    identityUserId: string;
    subject: string;
    email?: string;
  }> = [];
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async upsertFromIdentity(identity) {
          capturedIdentities.push({
            identityUserId: identity.identityUserId,
            subject: identity.subject,
            email: identity.email,
          });

          return {
            user: createUser({
              id: "user-123",
              identityUserId: identity.identityUserId,
              cognitoSubject: identity.subject,
              email: identity.email,
            }),
            created: true,
            emailUpdated: false,
          };
        },
      }),
      eventOutbox,
    }),
  );

  const registerUserFromIdentity = createRegisterUserFromIdentityUseCase({
    unitOfWork,
  });
  const result = await registerUserFromIdentity({
    identityUserId: " identity-user-123 ",
    subject: " subject-123 ",
    email: " USER@EXAMPLE.COM ",
  });

  assert.deepEqual(capturedIdentities, [
    {
      identityUserId: "identity-user-123",
      subject: "subject-123",
      email: "user@example.com",
    },
  ]);
  assert.equal(result.created, true);
  assert.equal(result.user.id, "user-123");
  assert.equal(eventOutbox.enqueuedEvents.length, 1);
  assert.equal(eventOutbox.enqueuedEvents[0]?.eventName, "user-registered.v1");
  assert.deepEqual(eventOutbox.enqueuedEvents[0]?.payload, {
    userId: "user-123",
    identityUserId: "identity-user-123",
    cognitoSubject: "subject-123",
    email: "user@example.com",
    status: "active",
  });
});

test("registerUserFromIdentity does not enqueue a registration event for existing users", async () => {
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async upsertFromIdentity(identity) {
          return {
            user: createUser({
              id: "user-123",
              identityUserId: identity.identityUserId,
              cognitoSubject: identity.subject,
              email: identity.email,
            }),
            created: false,
            emailUpdated: true,
          };
        },
      }),
      eventOutbox,
    }),
  );

  const registerUserFromIdentity = createRegisterUserFromIdentityUseCase({
    unitOfWork,
  });
  const result = await registerUserFromIdentity({
    identityUserId: "identity-user-123",
    subject: "subject-123",
    email: "updated@example.com",
  });

  assert.equal(result.created, false);
  assert.equal(result.emailUpdated, true);
  assert.equal(eventOutbox.enqueuedEvents.length, 0);
});

test("registerUserFromIdentity rejects blank subjects before opening a unit of work", async () => {
  let runCalls = 0;
  const unitOfWork = {
    async run() {
      runCalls += 1;
      throw new Error("UnitOfWork should not run when subject is blank.");
    },
  };

  const registerUserFromIdentity = createRegisterUserFromIdentityUseCase({
    unitOfWork,
  });

  await assert.rejects(
    () =>
      registerUserFromIdentity({
        identityUserId: "identity-user-123",
        subject: "   ",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.message, "subject is required.");
      return true;
    },
  );

  assert.equal(runCalls, 0);
});

test("registerUserFromIdentity rejects blank identity user ids before opening a unit of work", async () => {
  let runCalls = 0;
  const unitOfWork = {
    async run() {
      runCalls += 1;
      throw new Error("UnitOfWork should not run when identityUserId is blank.");
    },
  };

  const registerUserFromIdentity = createRegisterUserFromIdentityUseCase({
    unitOfWork,
  });

  await assert.rejects(
    () =>
      registerUserFromIdentity({
        identityUserId: "   ",
        subject: "subject-123",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.message, "identityUserId is required.");
      return true;
    },
  );

  assert.equal(runCalls, 0);
});
