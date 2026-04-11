import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../client/connection";
import { outboxEvents } from "../schema";
import type { DomainEvent } from "../../../domain/events/domain-event";
import type {
  ClaimPendingEventsInput,
  EventOutbox,
  EventOutboxRecord,
} from "../../../domain/ports/event-outbox";

export function createEventOutbox(db: Database): EventOutbox {
  return {
    async enqueue(event: DomainEvent): Promise<void> {
      await db.insert(outboxEvents).values({
        id: event.id,
        eventName: event.eventName,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        occurredAt: new Date(event.occurredAt),
      });
    },

    async claimPending(input: ClaimPendingEventsInput): Promise<EventOutboxRecord[]> {
      const claimedAt = new Date(input.claimedAt);
      const staleBefore = new Date(input.staleBefore);
      const result = await db.execute(sql`
        with claimable as (
          select id
          from outbox_events
          where published_at is null
            and (claimed_at is null or claimed_at <= ${staleBefore})
          order by occurred_at asc
          limit ${input.limit}
          for update skip locked
        )
        update outbox_events
        set
          claim_token = ${input.claimToken},
          claimed_at = ${claimedAt}
        where id in (select id from claimable)
        returning *
      `);

      const rows = ((result as { rows?: unknown[] }).rows ?? []) as RawOutboxEventRow[];

      return rows.map(mapEventOutboxRecord).sort((left, right) => {
        if (left.occurredAt === right.occurredAt) {
          return left.id.localeCompare(right.id);
        }

        return left.occurredAt.localeCompare(right.occurredAt);
      });
    },

    async markPublished(
      eventId: string,
      claimToken: string,
      nextAttemptCount: number,
    ): Promise<void> {
      const updated = await db
        .update(outboxEvents)
        .set({
          publishedAt: new Date(),
          claimToken: null,
          claimedAt: null,
          publishAttempts: nextAttemptCount,
          lastError: null,
        })
        .where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.claimToken, claimToken)))
        .returning({
          id: outboxEvents.id,
        });

      if (updated.length === 0) {
        throw new Error(`Outbox event ${eventId} could not be marked published for claim ${claimToken}.`);
      }
    },

    async markFailed(
      eventId: string,
      claimToken: string,
      nextAttemptCount: number,
      errorMessage: string,
    ): Promise<void> {
      const updated = await db
        .update(outboxEvents)
        .set({
          claimToken: null,
          claimedAt: null,
          publishAttempts: nextAttemptCount,
          lastError: truncateErrorMessage(errorMessage),
        })
        .where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.claimToken, claimToken)))
        .returning({
          id: outboxEvents.id,
        });

      if (updated.length === 0) {
        throw new Error(`Outbox event ${eventId} could not be marked failed for claim ${claimToken}.`);
      }
    },
  };
}

interface RawOutboxEventRow {
  id: string;
  event_name: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  occurred_at: string | Date;
  published_at?: string | Date | null;
  publish_attempts: number;
  last_error?: string | null;
}

function mapEventOutboxRecord(row: RawOutboxEventRow): EventOutboxRecord {
  return {
    id: row.id,
    eventName: row.event_name,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    occurredAt: toIsoString(row.occurred_at),
    payload: row.payload,
    publishedAt: row.published_at ? toIsoString(row.published_at) : undefined,
    publishAttempts: row.publish_attempts,
    lastError: row.last_error ?? undefined,
  };
}

function truncateErrorMessage(message: string): string {
  return message.length > 1_000 ? message.slice(0, 1_000) : message;
}

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
