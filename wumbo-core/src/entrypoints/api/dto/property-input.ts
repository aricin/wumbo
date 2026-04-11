import { ValidationError } from "../../../domain/errors/validation-error";
import type { PropertyVisibility } from "../../../domain/entities/property";

export interface CreatePropertyBody {
  slug: string;
  title: string;
  description?: string;
  visibility: PropertyVisibility;
}

export interface UpdatePropertyBody {
  slug?: string;
  title?: string;
  description?: string;
  visibility?: PropertyVisibility;
}

export function parseCreatePropertyBody(body: string | undefined): CreatePropertyBody {
  const parsed = parseJsonObject(body);
  const slug = typeof parsed.slug === "string" ? parsed.slug : undefined;
  const title = typeof parsed.title === "string" ? parsed.title : undefined;
  const description = typeof parsed.description === "string" ? parsed.description : "";
  const visibility = readVisibility(parsed.visibility);

  if (!slug) {
    throw new ValidationError("slug is required.");
  }

  if (!title) {
    throw new ValidationError("title is required.");
  }

  return {
    slug,
    title,
    description,
    visibility,
  };
}

export function parseUpdatePropertyBody(body: string | undefined): UpdatePropertyBody {
  const parsed = parseJsonObject(body);
  const slug = typeof parsed.slug === "string" ? parsed.slug : undefined;
  const title = typeof parsed.title === "string" ? parsed.title : undefined;
  const description = typeof parsed.description === "string" ? parsed.description : undefined;
  const visibility = parsed.visibility === undefined ? undefined : readVisibility(parsed.visibility);

  if (!slug && !title && description === undefined && visibility === undefined) {
    throw new ValidationError("At least one field must be provided.");
  }

  return {
    slug,
    title,
    description,
    visibility,
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

function readVisibility(value: unknown): PropertyVisibility {
  if (value === "public" || value === "private") {
    return value;
  }

  throw new ValidationError("visibility must be either \"public\" or \"private\".");
}
