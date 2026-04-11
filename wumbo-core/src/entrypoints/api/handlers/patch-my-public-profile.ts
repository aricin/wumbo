import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { dbUnitOfWork } from "../../../adapters/db/unit-of-work";
import { createUpdateMyPublicProfileUseCase } from "../../../domain/use-cases/update-my-public-profile";
import { ok, unauthorized } from "../../../shared/http/responses";
import { resolveIdentityActor } from "../auth/actor-context";
import { parseUpdatePublicProfileBody } from "../dto/profile-input";
import { toHttpErrorResponse } from "./error-response";

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const actor = resolveIdentityActor(event);

    if (!actor) {
      return unauthorized("Missing authenticated identity.");
    }

    const input = parseUpdatePublicProfileBody(event.body);
    const updateMyPublicProfile = createUpdateMyPublicProfileUseCase({
      unitOfWork: dbUnitOfWork,
    });
    const result = await updateMyPublicProfile({
      actor,
      handle: input.handle,
      displayName: input.displayName,
      bio: input.bio ?? "",
      avatarUrl: input.avatarUrl,
    });

    return ok({
      data: result.profile,
    });
  } catch (error) {
    return toHttpErrorResponse(error);
  }
}
