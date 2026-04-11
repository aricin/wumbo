import {
  createDomainEvent,
  defineDomainEvent,
} from "./domain-event";
import type { PropertyVisibility } from "../entities/property";

export interface PropertyCreatedPayload extends Record<string, unknown> {
  propertyId: string;
  ownerUserId: string;
  slug: string;
  title: string;
  visibility: PropertyVisibility;
}

export interface PropertyUpdatedPayload extends Record<string, unknown> {
  propertyId: string;
  ownerUserId: string;
  slug: string;
  title: string;
  visibility: PropertyVisibility;
}

export const propertyCreatedEvent = defineDomainEvent<PropertyCreatedPayload>({
  eventName: "property-created.v1",
  aggregateType: "property",
});

export const propertyUpdatedEvent = defineDomainEvent<PropertyUpdatedPayload>({
  eventName: "property-updated.v1",
  aggregateType: "property",
});

export function createPropertyCreatedEvent(
  payload: PropertyCreatedPayload,
) {
  return createDomainEvent(propertyCreatedEvent, {
    aggregateId: payload.propertyId,
    payload,
  });
}

export function createPropertyUpdatedEvent(
  payload: PropertyUpdatedPayload,
) {
  return createDomainEvent(propertyUpdatedEvent, {
    aggregateId: payload.propertyId,
    payload,
  });
}
