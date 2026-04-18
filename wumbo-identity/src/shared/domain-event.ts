import { randomUUID } from "node:crypto";

export type DomainEventPayload = Record<string, unknown>;

export interface DomainEvent<
  TPayload extends DomainEventPayload = DomainEventPayload,
> {
  id: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  payload: TPayload;
}

export interface DomainEventDefinition<
  TPayload extends DomainEventPayload = DomainEventPayload,
> {
  eventName: string;
  aggregateType: string;
}

export function createDomainEvent<TPayload extends DomainEventPayload>(
  definition: DomainEventDefinition<TPayload>,
  input: {
    aggregateId: string;
    payload: TPayload;
  },
): DomainEvent<TPayload> {
  return {
    id: randomUUID(),
    eventName: definition.eventName,
    aggregateType: definition.aggregateType,
    aggregateId: input.aggregateId,
    occurredAt: new Date().toISOString(),
    payload: input.payload,
  };
}
