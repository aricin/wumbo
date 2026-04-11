import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

import type { IdentityActor } from "../../../domain/entities/actor";
import { type RuntimeConfig, getRuntimeConfig } from "../../../shared/config/runtime";

export function resolveIdentityActor(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): IdentityActor | null {
  return resolveIdentityActorWithConfig(event, getRuntimeConfig());
}

export function resolveIdentityActorWithConfig(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  config: Pick<RuntimeConfig, "allowDevIdentityHeader">,
): IdentityActor | null {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  const subject = typeof claims?.sub === "string" ? claims.sub : undefined;

  if (subject) {
    return {
      subject,
      source: "jwt",
      email: typeof claims?.email === "string" ? claims.email : undefined,
      groups: parseGroupsClaim(claims?.["cognito:groups"]),
    };
  }

  if (!config.allowDevIdentityHeader) {
    return null;
  }

  const devUserId = readHeader(event.headers, "x-dev-user-id");

  if (!devUserId) {
    return null;
  }

  return {
    subject: devUserId,
    source: "dev-header",
    groups: [],
  };
}

function parseGroupsClaim(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return [];
  }

  if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmedValue) as unknown;

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (entry): entry is string => typeof entry === "string" && entry.trim() !== "",
        );
      }
    } catch {
      return [trimmedValue];
    }
  }

  if (trimmedValue.includes(",")) {
    return trimmedValue
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");
  }

  return [trimmedValue];
}

function readHeader(headers: Record<string, string | undefined>, name: string): string | undefined {
  const lowerName = name.toLowerCase();

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() === lowerName && headerValue && headerValue.trim() !== "") {
      return headerValue.trim();
    }
  }

  return undefined;
}
