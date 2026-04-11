import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { dbUnitOfWork } from "../../../adapters/db/unit-of-work";
import { createUpdateMyPrivateProfileUseCase } from "../../../domain/use-cases/update-my-private-profile";
import { ok, unauthorized } from "../../../shared/http/responses";
import { resolveIdentityActor } from "../auth/actor-context";
import { parseUpdatePrivateProfileBody } from "../dto/profile-input";
import { toHttpErrorResponse } from "./error-response";

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const actor = resolveIdentityActor(event);

    if (!actor) {
      return unauthorized("Missing authenticated identity.");
    }

    const input = parseUpdatePrivateProfileBody(event.body);
    const updateMyPrivateProfile = createUpdateMyPrivateProfileUseCase({
      unitOfWork: dbUnitOfWork,
    });
    const result = await updateMyPrivateProfile({
      actor,
      ...input,
    });

    return ok({
      data: result.profile,
    });
  } catch (error) {
    return toHttpErrorResponse(error);
  }
}
