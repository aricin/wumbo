import { NotFoundError } from "../errors/not-found-error";
import type { Property } from "../entities/property";
import { canReadProperty } from "../policies/property-policies";
import type { PropertiesRepository } from "../ports/properties-repository";

export interface GetPropertyInput {
  slug: string;
}

export interface GetPropertyResult {
  property: Property;
}

interface GetPropertyUseCaseDependencies {
  properties: PropertiesRepository;
}

export function createGetPropertyUseCase({
  properties,
}: GetPropertyUseCaseDependencies) {
  return async (input: GetPropertyInput): Promise<GetPropertyResult> => {
    const property = await properties.findBySlug(input.slug);

    if (!property || !canReadProperty(property)) {
      throw new NotFoundError("Property not found.");
    }

    return {
      property,
    };
  };
}
