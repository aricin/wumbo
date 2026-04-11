export type PropertyVisibility = "public" | "private";

export interface Property {
  id: string;
  ownerUserId: string;
  slug: string;
  title: string;
  description: string;
  visibility: PropertyVisibility;
  createdAt: string;
  updatedAt: string;
}
