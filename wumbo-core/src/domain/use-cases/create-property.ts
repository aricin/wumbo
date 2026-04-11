import { randomUUID } from "node:crypto";

import { ForbiddenError } from "../errors/forbidden-error";
import { NotFoundError } from "../errors/not-found-error";
import { ValidationError } from "../errors/validation-error";
import { type DomainActor, type IdentityActor } from "../entities/actor";
import type { Property, PropertyVisibility } from "../entities/property";
import { createPropertyCreatedEvent } from "../events/property-events";
import { canCreateProperty } from "../policies/property-policies";
import type { UnitOfWork } from "../ports/unit-of-work";

export interface CreatePropertyInput {
  actor: IdentityActor;
  slug: string;
  title: string;
  description: string;
  visibility: PropertyVisibility;
}

export interface CreatePropertyResult {
  property: Property;
}

interface CreatePropertyUseCaseDependencies {
  unitOfWork: UnitOfWork;
}

export function createCreatePropertyUseCase({
  unitOfWork,
}: CreatePropertyUseCaseDependencies) {
  return async (input: CreatePropertyInput): Promise<CreatePropertyResult> =>
    unitOfWork.run(async (context) => {
      const user = await context.users.findByCognitoSubject(input.actor.subject);

      if (!user) {
        throw new NotFoundError("Current user has not been initialized yet.");
      }

      const actor = resolveDomainActor(input.actor, user.id);

      if (!canCreateProperty(actor)) {
        throw new ForbiddenError("You cannot create properties.");
      }

      validateSlug(input.slug);

      const property = await context.properties.create({
        id: randomUUID(),
        ownerUserId: actor.userId,
        slug: input.slug,
        title: normalizeTitle(input.title),
        description: normalizeDescription(input.description),
        visibility: input.visibility,
      });

      await context.eventOutbox.enqueue(
        createPropertyCreatedEvent({
          propertyId: property.id,
          ownerUserId: property.ownerUserId,
          slug: property.slug,
          title: property.title,
          visibility: property.visibility,
        }),
      );

      return {
        property,
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

function validateSlug(slug: string): void {
  const trimmed = slug.trim();

  if (!/^[a-z0-9-]{3,80}$/.test(trimmed)) {
    throw new ValidationError("slug must be 3-80 characters of lowercase letters, numbers, or hyphens.");
  }
}
