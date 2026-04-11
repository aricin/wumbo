import assert from "node:assert/strict";
import { test } from "node:test";

import type { IdentityActor } from "../../../domain/entities/actor";
import { ForbiddenError } from "../../../domain/errors/forbidden-error";
import type { UpdatePropertyInput } from "../../../domain/use-cases/update-property";
import {
  buildUpdatePropertyHandler,
} from "../handlers/update-property";
import { createAuthorizedApiEvent } from "./helpers/events";
import { parseJsonBody } from "./helpers/http";

test("update-property handler returns 401 when the request has no authenticated actor", async () => {
  const handler = buildUpdatePropertyHandler({
    resolveIdentityActor: () => null,
    parseUpdatePropertyBody: () => {
      throw new Error("parseUpdatePropertyBody should not be called when auth is missing.");
    },
    createUpdatePropertyUseCase: () => {
      throw new Error("createUpdatePropertyUseCase should not be called when auth is missing.");
    },
    unitOfWork: {} as never,
    toHttpErrorResponse: (error) => {
      throw error;
    },
  });

  const response = await handler(
    createAuthorizedApiEvent({
      pathParameters: {
        propertyId: "property-1",
      },
      body: JSON.stringify({
        title: "Updated Title",
      }),
    }),
  );

  assert.equal(response.statusCode, 401);
  assert.deepEqual(parseJsonBody(response), {
    error: "Missing authenticated identity.",
  });
});

test("update-property handler returns 400 when the propertyId path parameter is missing", async () => {
  const handler = buildUpdatePropertyHandler({
    resolveIdentityActor: () => ({
      subject: "subject-123",
      source: "jwt",
      groups: [],
    }),
    parseUpdatePropertyBody: () => ({
      title: "Updated Title",
    }),
    createUpdatePropertyUseCase: () => {
      throw new Error("createUpdatePropertyUseCase should not be called when propertyId is missing.");
    },
    unitOfWork: {} as never,
    toHttpErrorResponse: (error) => ({
      statusCode: 400,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
    }),
  });

  const response = await handler(
    createAuthorizedApiEvent({
      pathParameters: {},
      body: JSON.stringify({
        title: "Updated Title",
      }),
    }),
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(parseJsonBody(response), {
    error: "Missing propertyId path parameter.",
  });
});

test("update-property handler maps domain errors to HTTP responses", async () => {
  const handler = buildUpdatePropertyHandler({
    resolveIdentityActor: () => ({
      subject: "subject-123",
      source: "jwt",
      groups: [],
    }),
    parseUpdatePropertyBody: () => ({
      title: "Updated Title",
    }),
    createUpdatePropertyUseCase: () => {
      return async () => {
        throw new ForbiddenError("You do not have permission to update this property.");
      };
    },
    unitOfWork: {} as never,
    toHttpErrorResponse: (error) => ({
      statusCode: error instanceof ForbiddenError ? 403 : 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
    }),
  });

  const response = await handler(
    createAuthorizedApiEvent({
      pathParameters: {
        propertyId: "property-1",
      },
      body: JSON.stringify({
        title: "Updated Title",
      }),
    }),
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(parseJsonBody(response), {
    error: "You do not have permission to update this property.",
  });
});

test("update-property handler returns 200 and passes the parsed input to the use case", async () => {
  const calls: Array<{
    actor: IdentityActor;
    propertyId: string;
    slug?: string;
    title?: string;
    description?: string;
    visibility?: "public" | "private";
  }> = [];
  const handler = buildUpdatePropertyHandler({
    resolveIdentityActor: () => ({
      subject: "subject-123",
      source: "jwt",
      email: "user@example.com",
      groups: ["admin"],
    }),
    parseUpdatePropertyBody: () => ({
      title: "Updated Title",
      visibility: "private",
    }),
    createUpdatePropertyUseCase: () => {
      return async (input: UpdatePropertyInput) => {
        calls.push(input);

        return {
          property: {
            id: input.propertyId,
            ownerUserId: "owner-1",
            slug: input.slug ?? "existing-slug",
            title: input.title ?? "Existing Title",
            description: input.description ?? "Existing Description",
            visibility: input.visibility ?? "public",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        };
      };
    },
    unitOfWork: {} as never,
    toHttpErrorResponse: (error) => {
      throw error;
    },
  });

  const response = await handler(
    createAuthorizedApiEvent({
      pathParameters: {
        propertyId: "property-1",
      },
      body: JSON.stringify({
        title: "Updated Title",
        visibility: "private",
      }),
    }),
  );

  assert.equal(response.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    actor: {
      subject: "subject-123",
      source: "jwt",
      email: "user@example.com",
      groups: ["admin"],
    },
    propertyId: "property-1",
    title: "Updated Title",
    visibility: "private",
  });
  assert.deepEqual(parseJsonBody(response), {
    data: {
      id: "property-1",
      ownerUserId: "owner-1",
      slug: "existing-slug",
      title: "Updated Title",
      description: "Existing Description",
      visibility: "private",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
});
