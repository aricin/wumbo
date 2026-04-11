import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveIdentityActor, resolveIdentityActorWithConfig } from "../auth/actor-context";
import { createAuthorizedApiEvent } from "./helpers/events";

test("resolveIdentityActor returns a JWT actor when JWT claims are present", () => {
  const actor = resolveIdentityActor(
    createAuthorizedApiEvent({
      requestContext: {
        ...createAuthorizedApiEvent().requestContext,
        authorizer: {
          principalId: "principal-id",
          integrationLatency: 0,
          jwt: {
            claims: {
              sub: "subject-123",
              email: "user@example.com",
              "cognito:groups": '["admin","customer"]',
            },
            scopes: [],
          },
        },
      },
    }),
  );

  assert.deepEqual(actor, {
    subject: "subject-123",
    source: "jwt",
    email: "user@example.com",
    groups: ["admin", "customer"],
  });
});

test("resolveIdentityActor falls back to the dev header when enabled", () => {
  const actor = resolveIdentityActorWithConfig(
    createAuthorizedApiEvent({
      headers: {
        "x-dev-user-id": "dev-user-123",
      },
      requestContext: {
        ...createAuthorizedApiEvent().requestContext,
        authorizer: {
          principalId: "principal-id",
          integrationLatency: 0,
          jwt: {
            claims: {},
            scopes: [],
          },
        },
      },
    }),
    {
      allowDevIdentityHeader: true,
    },
  );

  assert.deepEqual(actor, {
    subject: "dev-user-123",
    source: "dev-header",
    groups: [],
  });
});

test("resolveIdentityActor returns null when the dev header is disabled and no JWT subject exists", () => {
  const actor = resolveIdentityActorWithConfig(
    createAuthorizedApiEvent({
      headers: {
        "x-dev-user-id": "dev-user-123",
      },
      requestContext: {
        ...createAuthorizedApiEvent().requestContext,
        authorizer: {
          principalId: "principal-id",
          integrationLatency: 0,
          jwt: {
            claims: {},
            scopes: [],
          },
        },
      },
    }),
    {
      allowDevIdentityHeader: false,
    },
  );

  assert.equal(actor, null);
});
