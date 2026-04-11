import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { getDb } from "../../../adapters/db/client/connection";
import { createDbRepositories } from "../../../adapters/db/db-dependencies";
import { createGetMyProfileUseCase } from "../../../domain/use-cases/get-my-profile";
import { ok, unauthorized } from "../../../shared/http/responses";
import { resolveIdentityActor } from "../auth/actor-context";
import { toHttpErrorResponse } from "./error-response";

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const actor = resolveIdentityActor(event);

    if (!actor) {
      return unauthorized("Missing authenticated identity.");
    }

    const db = await getDb();
    const repositories = createDbRepositories(db);
    const getMyProfile = createGetMyProfileUseCase({
      users: repositories.users,
      publicProfiles: repositories.publicProfiles,
      privateProfiles: repositories.privateProfiles,
    });
    const result = await getMyProfile({
      actor,
    });

    return ok({
      data: result.profile,
    });
  } catch (error) {
    return toHttpErrorResponse(error);
  }
}
