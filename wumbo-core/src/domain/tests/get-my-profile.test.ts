import assert from "node:assert/strict";
import test from "node:test";

import { NotFoundError } from "../errors/not-found-error";
import { createGetMyProfileUseCase } from "../use-cases/get-my-profile";
import {
  createPrivateProfilesRepositoryFake,
  createPublicProfilesRepositoryFake,
  createUsersRepositoryFake,
} from "./helpers/fakes";
import {
  createIdentityActor,
  createPrivateProfile,
  createPublicProfile,
  createUser,
} from "./helpers/fixtures";

test("getMyProfile returns the combined profile for the current app user", async () => {
  const user = createUser({ id: "user-123", cognitoSubject: "subject-123" });
  const publicProfile = createPublicProfile({ userId: "user-123", handle: "wumbo_123" });
  const privateProfile = createPrivateProfile({ userId: "user-123", city: "Portland" });

  const getMyProfile = createGetMyProfileUseCase({
    users: createUsersRepositoryFake({
      async findByCognitoSubject(subject) {
        return subject === "subject-123" ? user : null;
      },
    }),
    publicProfiles: createPublicProfilesRepositoryFake({
      async findByUserId(userId) {
        return userId === "user-123" ? publicProfile : null;
      },
    }),
    privateProfiles: createPrivateProfilesRepositoryFake({
      async findByUserId(userId) {
        return userId === "user-123" ? privateProfile : null;
      },
    }),
  });

  const result = await getMyProfile({
    actor: createIdentityActor({ subject: "subject-123" }),
  });

  assert.deepEqual(result.profile, {
    userId: "user-123",
    cognitoSubject: "subject-123",
    email: user.email,
    publicProfile,
    privateProfile,
  });
});

test("getMyProfile throws when the current user is not initialized", async () => {
  const getMyProfile = createGetMyProfileUseCase({
    users: createUsersRepositoryFake({
      async findByCognitoSubject() {
        return null;
      },
    }),
    publicProfiles: createPublicProfilesRepositoryFake(),
    privateProfiles: createPrivateProfilesRepositoryFake(),
  });

  await assert.rejects(
    () =>
      getMyProfile({
        actor: createIdentityActor({ subject: "missing-subject" }),
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundError);
      assert.equal(error.message, "Current user has not been initialized yet.");
      return true;
    },
  );
});
