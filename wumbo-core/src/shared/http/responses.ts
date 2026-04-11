import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

export function json(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function ok(body: unknown): APIGatewayProxyStructuredResultV2 {
  return json(200, body);
}

export function created(body: unknown): APIGatewayProxyStructuredResultV2 {
  return json(201, body);
}

export function badRequest(message: string): APIGatewayProxyStructuredResultV2 {
  return json(400, {
    error: message,
  });
}

export function unauthorized(message: string): APIGatewayProxyStructuredResultV2 {
  return json(401, {
    error: message,
  });
}

export function forbidden(message: string): APIGatewayProxyStructuredResultV2 {
  return json(403, {
    error: message,
  });
}

export function notFound(message: string): APIGatewayProxyStructuredResultV2 {
  return json(404, {
    error: message,
  });
}

export function conflict(message: string): APIGatewayProxyStructuredResultV2 {
  return json(409, {
    error: message,
  });
}

export function serviceUnavailable(message: string): APIGatewayProxyStructuredResultV2 {
  return json(503, {
    error: message,
  });
}

export function internalServerError(): APIGatewayProxyStructuredResultV2 {
  return json(500, {
    error: "Internal server error.",
  });
}
