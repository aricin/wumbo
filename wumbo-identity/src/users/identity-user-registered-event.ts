import { createDomainEvent, type DomainEvent } from "../shared/domain-event";

export interface IdentityUserRegisteredPayload extends Record<string, unknown> {
  identityUserId: string;
  cognitoSubject: string;
  email?: string;
  emailVerified: boolean;
}

const identityUserRegisteredEvent = {
  eventName: "identity.user.registered.v1",
  aggregateType: "identity-user",
} as const;

export function createIdentityUserRegisteredEvent(
  payload: IdentityUserRegisteredPayload,
): DomainEvent<IdentityUserRegisteredPayload> {
  return createDomainEvent(identityUserRegisteredEvent, {
    aggregateId: payload.identityUserId,
    payload,
  });
}
