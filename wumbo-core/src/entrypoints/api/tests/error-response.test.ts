import assert from "node:assert/strict";
import { test } from "node:test";

import { ConflictError } from "../../../domain/errors/conflict-error";
import { ForbiddenError } from "../../../domain/errors/forbidden-error";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import { ValidationError } from "../../../domain/errors/validation-error";
import { toHttpErrorResponse } from "../handlers/error-response";
import { parseJsonBody } from "./helpers/http";

test("toHttpErrorResponse maps ValidationError to 400", () => {
  const response = toHttpErrorResponse(new ValidationError("Bad input."));

  assert.equal(response.statusCode, 400);
  assert.deepEqual(parseJsonBody(response), {
    error: "Bad input.",
  });
});

test("toHttpErrorResponse maps ForbiddenError to 403", () => {
  const response = toHttpErrorResponse(new ForbiddenError("Nope."));

  assert.equal(response.statusCode, 403);
  assert.deepEqual(parseJsonBody(response), {
    error: "Nope.",
  });
});

test("toHttpErrorResponse maps NotFoundError to 404", () => {
  const response = toHttpErrorResponse(new NotFoundError("Missing."));

  assert.equal(response.statusCode, 404);
  assert.deepEqual(parseJsonBody(response), {
    error: "Missing.",
  });
});

test("toHttpErrorResponse maps ConflictError to 409", () => {
  const response = toHttpErrorResponse(new ConflictError("Already exists."));

  assert.equal(response.statusCode, 409);
  assert.deepEqual(parseJsonBody(response), {
    error: "Already exists.",
  });
});

test("toHttpErrorResponse maps unknown errors to 500", () => {
  const response = toHttpErrorResponse(new Error("Unexpected."));

  assert.equal(response.statusCode, 500);
  assert.deepEqual(parseJsonBody(response), {
    error: "Internal server error.",
  });
});
