import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { resolveIdentityActor } from "../auth/actor-context";
import { ok, unauthorized } from "../../../shared/http/responses";

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  const actor = resolveIdentityActor(event);

  if (!actor) {
    return unauthorized("Missing authenticated identity.");
  }

  return ok({
    data: {
      subject: actor.subject,
      source: actor.source,
      email: actor.email ?? null,
      groups: actor.groups,
    },
  });
}
