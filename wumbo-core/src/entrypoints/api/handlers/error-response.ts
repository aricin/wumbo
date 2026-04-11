import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { ConflictError } from "../../../domain/errors/conflict-error";
import { ForbiddenError } from "../../../domain/errors/forbidden-error";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import { ValidationError } from "../../../domain/errors/validation-error";
import {
  badRequest,
  conflict,
  forbidden,
  internalServerError,
  notFound,
} from "../../../shared/http/responses";

export function toHttpErrorResponse(error: unknown): APIGatewayProxyStructuredResultV2 {
  if (error instanceof ValidationError) {
    return badRequest(error.message);
  }

  if (error instanceof ForbiddenError) {
    return forbidden(error.message);
  }

  if (error instanceof NotFoundError) {
    return notFound(error.message);
  }

  if (error instanceof ConflictError) {
    return conflict(error.message);
  }

  console.error("Unhandled API error.", error);
  return internalServerError();
}
