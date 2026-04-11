import assert from "node:assert/strict";
import { test } from "node:test";

import { NotFoundError } from "../../../domain/errors/not-found-error";
import type { GetPublicProfileInput } from "../../../domain/use-cases/get-public-profile";
import { buildGetPublicProfileHandler } from "../handlers/get-public-profile";
import { createApiEvent } from "./helpers/events";
import { parseJsonBody } from "./helpers/http";

test("get-public-profile handler returns 400 when the profile handle is missing", async () => {
  const handler = buildGetPublicProfileHandler({
    getDb: async () => {
      throw new Error("getDb should not be called when handle is missing.");
    },
    createDbRepositories: () => {
      throw new Error("createDbRepositories should not be called when handle is missing.");
    },
    createGetPublicProfileUseCase: () => {
      throw new Error("createGetPublicProfileUseCase should not be called when handle is missing.");
    },
    toHttpErrorResponse: (error) => ({
      statusCode: 400,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
    }),
  });

  const response = await handler(
    createApiEvent({
      pathParameters: {},
    }),
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(parseJsonBody(response), {
    error: "Missing profile handle.",
  });
});

test("get-public-profile handler lowercases the handle and returns the use-case result", async () => {
  const calls: string[] = [];
  const handler = buildGetPublicProfileHandler({
    getDb: async () => ({}) as never,
    createDbRepositories: () =>
      ({
        publicProfiles: {},
      }) as never,
    createGetPublicProfileUseCase: () => {
      return async ({ handle }: GetPublicProfileInput) => {
        calls.push(handle);

        return {
          profile: {
            userId: "user-1",
            handle,
            displayName: "Wumbo User",
            bio: "Bio",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        };
      };
    },
    toHttpErrorResponse: (error) => {
      throw error;
    },
  });

  const response = await handler(
    createApiEvent({
      pathParameters: {
        handle: "Wumbo_User",
      },
    }),
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, ["wumbo_user"]);
  assert.deepEqual(parseJsonBody(response), {
    data: {
      userId: "user-1",
      handle: "wumbo_user",
      displayName: "Wumbo User",
      bio: "Bio",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
});

test("get-public-profile handler maps use-case not found errors to 404", async () => {
  const handler = buildGetPublicProfileHandler({
    getDb: async () => ({}) as never,
    createDbRepositories: () =>
      ({
        publicProfiles: {},
      }) as never,
    createGetPublicProfileUseCase: () => {
      return async () => {
        throw new NotFoundError("Profile not found.");
      };
    },
    toHttpErrorResponse: (error) => ({
      statusCode: error instanceof NotFoundError ? 404 : 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
    }),
  });

  const response = await handler(
    createApiEvent({
      pathParameters: {
        handle: "missing-handle",
      },
    }),
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(parseJsonBody(response), {
    error: "Profile not found.",
  });
});
