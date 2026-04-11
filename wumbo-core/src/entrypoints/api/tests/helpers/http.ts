import assert from "node:assert/strict";

import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function parseJsonBody(response: APIGatewayProxyStructuredResultV2): unknown {
  assert.ok(response.body, "Expected response body to be defined.");
  return JSON.parse(response.body);
}
