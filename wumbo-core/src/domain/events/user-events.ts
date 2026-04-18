import {
  createDomainEvent,
  defineDomainEvent,
} from "./domain-event";

export interface UserRegisteredPayload extends Record<string, unknown> {
  userId: string;
  identityUserId?: string;
  cognitoSubject: string;
  email?: string;
  status: string;
}

export const userRegisteredEvent = defineDomainEvent<UserRegisteredPayload>({
  eventName: "user-registered.v1",
  aggregateType: "user",
});

export function createUserRegisteredEvent(
  payload: UserRegisteredPayload,
) {
  return createDomainEvent(userRegisteredEvent, {
    aggregateId: payload.userId,
    payload,
  });
}
