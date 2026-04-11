import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { getDb } from "../../../adapters/db/client/connection";
import { createDbRepositories } from "../../../adapters/db/db-dependencies";
import { ValidationError } from "../../../domain/errors/validation-error";
import { createGetPropertyUseCase } from "../../../domain/use-cases/get-property";
import { ok } from "../../../shared/http/responses";
import { toHttpErrorResponse } from "./error-response";

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const slug = event.pathParameters?.slug;

    if (!slug) {
      return toHttpErrorResponse(new ValidationError("Missing property slug."));
    }

    const db = await getDb();
    const repositories = createDbRepositories(db);
    const getPropertyBySlug = createGetPropertyUseCase({
      properties: repositories.properties,
    });
    const result = await getPropertyBySlug({
      slug,
    });

    return ok({
      data: result.property,
    });
  } catch (error) {
    return toHttpErrorResponse(error);
  }
}
