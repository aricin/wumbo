import { ValidationError } from "../../../domain/errors/validation-error";

export interface UpdatePublicProfileBody {
  handle: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdatePrivateProfileBody {
  legalName?: string;
  phoneNumber?: string;
  contactEmail?: string;
  city?: string;
  stateRegion?: string;
  countryCode?: string;
}

export function parseUpdatePublicProfileBody(body: string | undefined): UpdatePublicProfileBody {
  const parsed = parseJsonObject(body);
  const handle = typeof parsed.handle === "string" ? parsed.handle : undefined;
  const displayName = typeof parsed.displayName === "string" ? parsed.displayName : undefined;
  const bio = typeof parsed.bio === "string" ? parsed.bio : "";
  const avatarUrl = typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : undefined;

  if (!handle) {
    throw new ValidationError("handle is required.");
  }

  if (!displayName) {
    throw new ValidationError("displayName is required.");
  }

  return {
    handle,
    displayName,
    bio,
    avatarUrl,
  };
}

export function parseUpdatePrivateProfileBody(body: string | undefined): UpdatePrivateProfileBody {
  const parsed = parseJsonObject(body);

  return {
    legalName: readOptionalString(parsed.legalName),
    phoneNumber: readOptionalString(parsed.phoneNumber),
    contactEmail: readOptionalString(parsed.contactEmail),
    city: readOptionalString(parsed.city),
    stateRegion: readOptionalString(parsed.stateRegion),
    countryCode: readOptionalString(parsed.countryCode),
  };
}

function parseJsonObject(body: string | undefined): Record<string, unknown> {
  if (!body) {
    throw new ValidationError("Request body is required.");
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(body);
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }

  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return parsedBody as Record<string, unknown>;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
