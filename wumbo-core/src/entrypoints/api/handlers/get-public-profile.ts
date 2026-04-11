import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { getDb } from "../../../adapters/db/client/connection";
import { createDbRepositories } from "../../../adapters/db/db-dependencies";
import { ValidationError } from "../../../domain/errors/validation-error";
import { createGetPublicProfileUseCase } from "../../../domain/use-cases/get-public-profile";
import { ok } from "../../../shared/http/responses";
import { toHttpErrorResponse } from "./error-response";

interface GetPublicProfileHandlerDependencies {
  getDb: typeof getDb;
  createDbRepositories: typeof createDbRepositories;
  createGetPublicProfileUseCase: typeof createGetPublicProfileUseCase;
  toHttpErrorResponse: typeof toHttpErrorResponse;
}

export function buildGetPublicProfileHandler({
  getDb,
  createDbRepositories,
  createGetPublicProfileUseCase,
  toHttpErrorResponse,
}: GetPublicProfileHandlerDependencies) {
  return async function handler(
    event: APIGatewayProxyEventV2,
  ): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      const handle = event.pathParameters?.handle;

      if (!handle) {
        return toHttpErrorResponse(new ValidationError("Missing profile handle."));
      }

      const db = await getDb();
      const repositories = createDbRepositories(db);
      const getPublicProfileByHandle = createGetPublicProfileUseCase({
        publicProfiles: repositories.publicProfiles,
      });
      const result = await getPublicProfileByHandle({
        handle: handle.toLowerCase(),
      });

      return ok({
        data: result.profile,
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  };
}

export const handler = buildGetPublicProfileHandler({
  getDb,
  createDbRepositories,
  createGetPublicProfileUseCase,
  toHttpErrorResponse,
});
