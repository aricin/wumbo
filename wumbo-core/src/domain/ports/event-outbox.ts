import type { DomainEvent } from "../events/domain-event";

export interface EventOutboxRecord extends DomainEvent {
  publishedAt?: string;
  publishAttempts: number;
  lastError?: string;
}

export interface ClaimPendingEventsInput {
  limit: number;
  claimToken: string;
  claimedAt: string;
  staleBefore: string;
}

export interface EventOutbox {
  enqueue(event: DomainEvent): Promise<void>;
  claimPending(input: ClaimPendingEventsInput): Promise<EventOutboxRecord[]>;
  markPublished(eventId: string, claimToken: string, nextAttemptCount: number): Promise<void>;
  markFailed(
    eventId: string,
    claimToken: string,
    nextAttemptCount: number,
    errorMessage: string,
  ): Promise<void>;
}
