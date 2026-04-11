import assert from "node:assert/strict";
import { test } from "node:test";

import type { IdentityActor } from "../../../domain/entities/actor";
import type { CreatePropertyInput } from "../../../domain/use-cases/create-property";
import { ValidationError } from "../../../domain/errors/validation-error";
import {
  buildCreatePropertyHandler,
} from "../handlers/create-property";
import { createAuthorizedApiEvent } from "./helpers/events";
import { parseJsonBody } from "./helpers/http";

test("create-property handler returns 401 when the request has no authenticated actor", async () => {
  const handler = buildCreatePropertyHandler({
    resolveIdentityActor: () => null,
    parseCreatePropertyBody: () => {
      throw new Error("parseCreatePropertyBody should not be called when auth is missing.");
    },
    createCreatePropertyUseCase: () => {
      throw new Error("createCreatePropertyUseCase should not be called when auth is missing.");
    },
    unitOfWork: {} as never,
    toHttpErrorResponse: (error) => {
      throw error;
    },
  });

  const response = await handler(
    createAuthorizedApiEvent({
      body: JSON.stringify({
        slug: "property-slug",
        title: "Property Title",
        visibility: "public",
      }),
    }),
  );

  assert.equal(response.statusCode, 401);
  assert.deepEqual(parseJsonBody(response), {
    error: "Missing authenticated identity.",
  });
});

test("create-property handler returns 400 for invalid request bodies", async () => {
  const handler = buildCreatePropertyHandler({
    resolveIdentityActor: () => ({
      subject: "subject-123",
      source: "jwt",
      groups: [],
    }),
    parseCreatePropertyBody: () => {
      throw new ValidationError("slug is required.");
    },
    createCreatePropertyUseCase: () => {
      throw new Error("createCreatePropertyUseCase should not be called when parsing fails.");
    },
    unitOfWork: {} as never,
    toHttpErrorResponse: (error) => {
      if (!(error instanceof ValidationError)) {
        throw error;
      }

      return {
        statusCode: 400,
        body: JSON.stringify({
          error: error.message,
        }),
      };
    },
  });

  const response = await handler(
    createAuthorizedApiEvent({
      body: JSON.stringify({
        title: "Property Title",
        visibility: "public",
      }),
    }),
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(parseJsonBody(response), {
    error: "slug is required.",
  });
});

test("create-property handler returns 201 and passes parsed input to the use case", async () => {
  const calls: Array<{
    actor: IdentityActor;
    slug: string;
    title: string;
    description: string;
    visibility: "public" | "private";
  }> = [];
  const handler = buildCreatePropertyHandler({
    resolveIdentityActor: () => ({
      subject: "subject-123",
      source: "jwt",
      email: "user@example.com",
      groups: [],
    }),
    parseCreatePropertyBody: (body) => JSON.parse(body ?? "{}"),
    createCreatePropertyUseCase: () => {
      return async (input: CreatePropertyInput) => {
        calls.push(input);

        return {
          property: {
            id: "property-1",
            ownerUserId: "user-1",
            slug: input.slug,
            title: input.title,
            description: input.description,
            visibility: input.visibility,
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
      body: JSON.stringify({
        slug: "property-slug",
        title: "Property Title",
        description: "Property Description",
        visibility: "private",
      }),
    }),
  );

  assert.equal(response.statusCode, 201);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    actor: {
      subject: "subject-123",
      source: "jwt",
      email: "user@example.com",
      groups: [],
    },
    slug: "property-slug",
    title: "Property Title",
    description: "Property Description",
    visibility: "private",
  });
  assert.deepEqual(parseJsonBody(response), {
    data: {
      id: "property-1",
      ownerUserId: "user-1",
      slug: "property-slug",
      title: "Property Title",
      description: "Property Description",
      visibility: "private",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
});
