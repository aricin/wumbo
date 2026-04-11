import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { dbUnitOfWork } from "../../../adapters/db/unit-of-work";
import { createUpdatePropertyUseCase } from "../../../domain/use-cases/update-property";
import { ValidationError } from "../../../domain/errors/validation-error";
import { ok, unauthorized } from "../../../shared/http/responses";
import { resolveIdentityActor } from "../auth/actor-context";
import { parseUpdatePropertyBody } from "../dto/property-input";
import { toHttpErrorResponse } from "./error-response";

interface UpdatePropertyHandlerDependencies {
  resolveIdentityActor: typeof resolveIdentityActor;
  parseUpdatePropertyBody: typeof parseUpdatePropertyBody;
  createUpdatePropertyUseCase: typeof createUpdatePropertyUseCase;
  unitOfWork: typeof dbUnitOfWork;
  toHttpErrorResponse: typeof toHttpErrorResponse;
}

export function buildUpdatePropertyHandler({
  resolveIdentityActor,
  parseUpdatePropertyBody,
  createUpdatePropertyUseCase,
  unitOfWork,
  toHttpErrorResponse,
}: UpdatePropertyHandlerDependencies) {
  return async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      const actor = resolveIdentityActor(event);

      if (!actor) {
        return unauthorized("Missing authenticated identity.");
      }

      const propertyId = event.pathParameters?.propertyId;

      if (!propertyId) {
        return toHttpErrorResponse(new ValidationError("Missing propertyId path parameter."));
      }

      const input = parseUpdatePropertyBody(event.body);
      const updateProperty = createUpdatePropertyUseCase({
        unitOfWork,
      });
      const result = await updateProperty({
        actor,
        propertyId,
        ...input,
      });

      return ok({
        data: result.property,
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  };
}

export const handler = buildUpdatePropertyHandler({
  resolveIdentityActor,
  parseUpdatePropertyBody,
  createUpdatePropertyUseCase,
  unitOfWork: dbUnitOfWork,
  toHttpErrorResponse,
});
