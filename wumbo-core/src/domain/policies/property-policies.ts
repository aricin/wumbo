import { isAdmin, type DomainActor } from "../entities/actor";
import type { Property } from "../entities/property";

export function canReadProperty(property: Property): boolean {
  return property.visibility === "public";
}

export function canCreateProperty(_actor: DomainActor): boolean {
  return true;
}

export function canUpdateProperty(actor: DomainActor, property: Property): boolean {
  return actor.userId === property.ownerUserId || isAdmin(actor);
}
