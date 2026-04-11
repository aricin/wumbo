import assert from "node:assert/strict";
import test from "node:test";

import { NotFoundError } from "../errors/not-found-error";
import { createGetPublicProfileUseCase } from "../use-cases/get-public-profile";
import { createPublicProfilesRepositoryFake } from "./helpers/fakes";
import { createPublicProfile } from "./helpers/fixtures";

test("getPublicProfile returns the public profile for a matching handle", async () => {
  const profile = createPublicProfile({ handle: "wumbo_public" });
  const getPublicProfile = createGetPublicProfileUseCase({
    publicProfiles: createPublicProfilesRepositoryFake({
      async findByHandle(handle) {
        return handle === "wumbo_public" ? profile : null;
      },
    }),
  });

  const result = await getPublicProfile({
    handle: "wumbo_public",
  });

  assert.equal(result.profile, profile);
});

test("getPublicProfile throws when the profile does not exist", async () => {
  const getPublicProfile = createGetPublicProfileUseCase({
    publicProfiles: createPublicProfilesRepositoryFake({
      async findByHandle() {
        return null;
      },
    }),
  });

  await assert.rejects(
    () =>
      getPublicProfile({
        handle: "missing_handle",
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundError);
      assert.equal(error.message, "Profile not found.");
      return true;
    },
  );
});
