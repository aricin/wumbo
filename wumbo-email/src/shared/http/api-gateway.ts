import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
} from "aws-lambda";

export type ApiGatewayEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

export function getHeader(
  headers: ApiGatewayEvent["headers"],
  name: string,
): string | undefined {
  const target = name.toLowerCase();

  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === target && value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function getRequestMethod(event: ApiGatewayEvent): string {
  if ("httpMethod" in event && typeof event.httpMethod === "string") {
    return event.httpMethod.toUpperCase();
  }

  return (event as APIGatewayProxyEventV2).requestContext.http.method.toUpperCase();
}

export function readRequestBody(
  event: Pick<ApiGatewayEvent, "body" | "isBase64Encoded">,
): string {
  const body = event.body ?? "";

  if (!event.isBase64Encoded) {
    return body;
  }

  return Buffer.from(body, "base64").toString("utf8");
}

export function htmlResponse(
  body: string,
  statusCode = 200,
  headers?: Record<string, string>,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
    body,
  };
}

export function textResponse(
  body: string,
  statusCode = 200,
  headers?: Record<string, string>,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
    body,
  };
}
