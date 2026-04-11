import {
  createDomainEvent,
  defineDomainEvent,
} from "./domain-event";

export interface PublicProfileUpdatedPayload extends Record<string, unknown> {
  userId: string;
  handle: string;
  displayName: string;
}

export interface PrivateProfileUpdatedPayload extends Record<string, unknown> {
  userId: string;
}

export const publicProfileUpdatedEvent =
  defineDomainEvent<PublicProfileUpdatedPayload>({
    eventName: "public-profile-updated.v1",
    aggregateType: "public-profile",
  });

export const privateProfileUpdatedEvent =
  defineDomainEvent<PrivateProfileUpdatedPayload>({
    eventName: "private-profile-updated.v1",
    aggregateType: "private-profile",
  });

export function createPublicProfileUpdatedEvent(
  payload: PublicProfileUpdatedPayload,
) {
  return createDomainEvent(publicProfileUpdatedEvent, {
    aggregateId: payload.userId,
    payload,
  });
}

export function createPrivateProfileUpdatedEvent(
  payload: PrivateProfileUpdatedPayload,
) {
  return createDomainEvent(privateProfileUpdatedEvent, {
    aggregateId: payload.userId,
    payload,
  });
}
