import { ForbiddenError } from "../errors/forbidden-error";
import { NotFoundError } from "../errors/not-found-error";
import { ValidationError } from "../errors/validation-error";
import type { DomainActor, IdentityActor } from "../entities/actor";
import type { Property, PropertyVisibility } from "../entities/property";
import { createPropertyUpdatedEvent } from "../events/property-events";
import { canUpdateProperty } from "../policies/property-policies";
import type { UnitOfWork } from "../ports/unit-of-work";

export interface UpdatePropertyInput {
  actor: IdentityActor;
  propertyId: string;
  slug?: string;
  title?: string;
  description?: string;
  visibility?: PropertyVisibility;
}

export interface UpdatePropertyResult {
  property: Property;
}

interface UpdatePropertyUseCaseDependencies {
  unitOfWork: UnitOfWork;
}

export function createUpdatePropertyUseCase({
  unitOfWork,
}: UpdatePropertyUseCaseDependencies) {
  return async (input: UpdatePropertyInput): Promise<UpdatePropertyResult> =>
    unitOfWork.run(async (context) => {
      const user = await context.users.findByCognitoSubject(input.actor.subject);

      if (!user) {
        throw new NotFoundError("Current user has not been initialized yet.");
      }

      const actor = resolveDomainActor(input.actor, user.id);
      const property = await context.properties.findById(input.propertyId);

      if (!property) {
        throw new NotFoundError("Property not found.");
      }

      if (!canUpdateProperty(actor, property)) {
        throw new ForbiddenError("You do not have permission to update this property.");
      }

      const updated = await context.properties.update({
        id: property.id,
        slug: input.slug ? normalizeSlug(input.slug) : undefined,
        title: input.title ? normalizeTitle(input.title) : undefined,
        description: input.description ? normalizeDescription(input.description) : undefined,
        visibility: input.visibility,
      });

      await context.eventOutbox.enqueue(
        createPropertyUpdatedEvent({
          propertyId: updated.id,
          ownerUserId: updated.ownerUserId,
          slug: updated.slug,
          title: updated.title,
          visibility: updated.visibility,
        }),
      );

      return {
        property: updated,
      };
    });
}

function resolveDomainActor(actor: IdentityActor, userId: string): DomainActor {
  return {
    ...actor,
    userId,
  };
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();

  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new ValidationError("title must be between 1 and 120 characters.");
  }

  return trimmed;
}

function normalizeDescription(description: string): string {
  const trimmed = description.trim();

  if (trimmed.length > 2_000) {
    throw new ValidationError("description must be 2000 characters or fewer.");
  }

  return trimmed;
}

function normalizeSlug(slug: string): string {
  const trimmed = slug.trim();

  if (!/^[a-z0-9-]{3,80}$/.test(trimmed)) {
    throw new ValidationError("slug must be 3-80 characters of lowercase letters, numbers, or hyphens.");
  }

  return trimmed;
}
