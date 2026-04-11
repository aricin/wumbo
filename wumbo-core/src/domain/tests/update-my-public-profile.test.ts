import assert from "node:assert/strict";
import test from "node:test";

import { ValidationError } from "../errors/validation-error";
import { createUpdateMyPublicProfileUseCase } from "../use-cases/update-my-public-profile";
import {
  createEventOutboxFake,
  createPublicProfilesRepositoryFake,
  createUnitOfWorkFake,
  createUsersRepositoryFake,
  createWriteContextFake,
} from "./helpers/fakes";
import { createIdentityActor, createUser } from "./helpers/fixtures";

test("updateMyPublicProfile normalizes fields and enqueues an event", async () => {
  const upsertInputs: Array<{
    userId: string;
    handle: string;
    displayName: string;
    bio: string;
    avatarUrl?: string;
  }> = [];
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "user-123", cognitoSubject: subject });
        },
      }),
      publicProfiles: createPublicProfilesRepositoryFake({
        async upsertForUser(input) {
          upsertInputs.push(input);

          return {
            userId: input.userId,
            handle: input.handle,
            displayName: input.displayName,
            bio: input.bio,
            avatarUrl: input.avatarUrl,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        },
      }),
      eventOutbox,
    }),
  );

  const updateMyPublicProfile = createUpdateMyPublicProfileUseCase({ unitOfWork });
  const result = await updateMyPublicProfile({
    actor: createIdentityActor(),
    handle: "  Wumbo_User  ",
    displayName: "  Wumbo User  ",
    bio: "  Building the future.  ",
    avatarUrl: " https://example.com/avatar.png ",
  });

  assert.equal(upsertInputs.length, 1);
  assert.deepEqual(upsertInputs[0], {
    userId: "user-123",
    handle: "wumbo_user",
    displayName: "Wumbo User",
    bio: "Building the future.",
    avatarUrl: "https://example.com/avatar.png",
  });
  assert.equal(result.profile.handle, "wumbo_user");
  assert.equal(eventOutbox.enqueuedEvents.length, 1);
  assert.equal(eventOutbox.enqueuedEvents[0]?.eventName, "public-profile-updated.v1");
});

test("updateMyPublicProfile rejects invalid handles before writing", async () => {
  let upsertCalls = 0;
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "user-123", cognitoSubject: subject });
        },
      }),
      publicProfiles: createPublicProfilesRepositoryFake({
        async upsertForUser(input) {
          upsertCalls += 1;
          return {
            userId: input.userId,
            handle: input.handle,
            displayName: input.displayName,
            bio: input.bio,
            avatarUrl: input.avatarUrl,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        },
      }),
      eventOutbox,
    }),
  );

  const updateMyPublicProfile = createUpdateMyPublicProfileUseCase({ unitOfWork });

  await assert.rejects(
    () =>
      updateMyPublicProfile({
        actor: createIdentityActor(),
        handle: "not valid",
        displayName: "Wumbo User",
        bio: "Bio",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(
        error.message,
        "handle must be 3-40 characters of lowercase letters, numbers, or underscores.",
      );
      return true;
    },
  );

  assert.equal(upsertCalls, 0);
  assert.equal(eventOutbox.enqueuedEvents.length, 0);
});

test("updateMyPublicProfile rejects invalid avatar URLs", async () => {
  let upsertCalls = 0;
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "user-123", cognitoSubject: subject });
        },
      }),
      publicProfiles: createPublicProfilesRepositoryFake({
        async upsertForUser(input) {
          upsertCalls += 1;
          return {
            userId: input.userId,
            handle: input.handle,
            displayName: input.displayName,
            bio: input.bio,
            avatarUrl: input.avatarUrl,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        },
      }),
    }),
  );

  const updateMyPublicProfile = createUpdateMyPublicProfileUseCase({ unitOfWork });

  await assert.rejects(
    () =>
      updateMyPublicProfile({
        actor: createIdentityActor(),
        handle: "wumbo_user",
        displayName: "Wumbo User",
        bio: "Bio",
        avatarUrl: "ftp://example.com/avatar.png",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.message, "avatarUrl must be a valid http or https URL.");
      return true;
    },
  );

  assert.equal(upsertCalls, 0);
});
