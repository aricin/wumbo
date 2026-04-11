import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { dbUnitOfWork } from "../../../adapters/db/unit-of-work";
import { createCreatePropertyUseCase } from "../../../domain/use-cases/create-property";
import { created, unauthorized } from "../../../shared/http/responses";
import { resolveIdentityActor } from "../auth/actor-context";
import { parseCreatePropertyBody } from "../dto/property-input";
import { toHttpErrorResponse } from "./error-response";

interface CreatePropertyHandlerDependencies {
  resolveIdentityActor: typeof resolveIdentityActor;
  parseCreatePropertyBody: typeof parseCreatePropertyBody;
  createCreatePropertyUseCase: typeof createCreatePropertyUseCase;
  unitOfWork: typeof dbUnitOfWork;
  toHttpErrorResponse: typeof toHttpErrorResponse;
}

export function buildCreatePropertyHandler({
  resolveIdentityActor,
  parseCreatePropertyBody,
  createCreatePropertyUseCase,
  unitOfWork,
  toHttpErrorResponse,
}: CreatePropertyHandlerDependencies) {
  return async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      const actor = resolveIdentityActor(event);

      if (!actor) {
        return unauthorized("Missing authenticated identity.");
      }

      const input = parseCreatePropertyBody(event.body);
      const createProperty = createCreatePropertyUseCase({
        unitOfWork,
      });
      const result = await createProperty({
        actor,
        slug: input.slug,
        title: input.title,
        description: input.description ?? "",
        visibility: input.visibility,
      });

      return created({
        data: result.property,
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  };
}

export const handler = buildCreatePropertyHandler({
  resolveIdentityActor,
  parseCreatePropertyBody,
  createCreatePropertyUseCase,
  unitOfWork: dbUnitOfWork,
  toHttpErrorResponse,
});
