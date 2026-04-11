import type { Property, PropertyVisibility } from "../entities/property";

export interface CreatePropertyInput {
  id: string;
  ownerUserId: string;
  slug: string;
  title: string;
  description: string;
  visibility: PropertyVisibility;
}

export interface UpdatePropertyInput {
  id: string;
  slug?: string;
  title?: string;
  description?: string;
  visibility?: PropertyVisibility;
}

export interface PropertiesRepository {
  findBySlug(slug: string): Promise<Property | null>;
  findById(id: string): Promise<Property | null>;
  findPublicBySlug(slug: string): Promise<Property | null>;
  create(input: CreatePropertyInput): Promise<Property>;
  update(input: UpdatePropertyInput): Promise<Property>;
}
