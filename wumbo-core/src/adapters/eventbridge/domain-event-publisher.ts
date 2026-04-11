import { randomUUID } from "node:crypto";

import type {
  PutEventsCommandOutput,
  PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

import { getDb } from "../db/client/connection";
import { createEventOutbox } from "../db/repositories/event-outbox";
import type { EventOutbox, EventOutboxRecord } from "../../domain/ports/event-outbox";
import { getRuntimeConfig } from "../../shared/config/runtime";

const eventBridgeClient = new EventBridgeClient({});

export interface PublishOutboxSummary {
  processed: number;
  published: number;
  failed: number;
  skipped: boolean;
  reason?: string;
}

interface PublishPendingOutboxBatchDependencies {
  getConfig?: typeof getRuntimeConfig;
  getEventOutbox?: () => Promise<EventOutbox>;
  putEvents?: (entries: PutEventsRequestEntry[]) => Promise<PutEventsCommandOutput>;
  createClaimToken?: () => string;
  getCurrentTime?: () => Date;
}

/**
 * Publishes domain events from the transactional outbox.
 *
 * Each run claims a batch of unpublished rows in Postgres, publishes them to
 * EventBridge, and then finalizes only the rows that still belong to the same
 * claim token. This keeps overlapping publisher runs from processing the same
 * rows, while still allowing stale claims to be reclaimed later if a worker
 * crashes mid-run.
 */
export function buildPublishPendingOutboxBatch({
  getConfig = getRuntimeConfig,
  getEventOutbox = defaultGetEventOutbox,
  putEvents = defaultPutEvents,
  createClaimToken = randomUUID,
  getCurrentTime = () => new Date(),
}: PublishPendingOutboxBatchDependencies = {}) {
  return async function publishPendingOutboxBatch(): Promise<PublishOutboxSummary> {
    const config = getConfig();

    if (!config.eventBusName) {
      return {
        processed: 0,
        published: 0,
        failed: 0,
        skipped: true,
        reason: "EVENT_BUS_NAME is not configured.",
      };
    }

    const outbox = await getEventOutbox();
    const claimToken = createClaimToken();
    const claimedAt = getCurrentTime();
    const staleBefore = new Date(
      claimedAt.getTime() - config.publisherClaimTimeoutSeconds * 1_000,
    );
    const pendingEvents = await outbox.claimPending({
      limit: config.publisherBatchSize,
      claimToken,
      claimedAt: claimedAt.toISOString(),
      staleBefore: staleBefore.toISOString(),
    });

    if (pendingEvents.length === 0) {
      return {
        processed: 0,
        published: 0,
        failed: 0,
        skipped: false,
      };
    }

    const response = await putEvents(
      pendingEvents.map((event) => ({
        EventBusName: config.eventBusName,
        Source: buildEventSource(config.serviceName),
        DetailType: event.eventName,
        Time: new Date(event.occurredAt),
        Detail: JSON.stringify(toEventBridgeDetail(event)),
      })),
    );

    const entries = response.Entries ?? [];
    let published = 0;
    let failed = 0;

    for (const [index, event] of pendingEvents.entries()) {
      const result = entries[index];
      const nextAttemptCount = event.publishAttempts + 1;

      if (result?.EventId) {
        published += 1;
        // Finalize only rows that still belong to this publisher claim.
        await outbox.markPublished(event.id, claimToken, nextAttemptCount);
        continue;
      }

      failed += 1;
      // Failed rows are released for retry with attempt/error metadata.
      await outbox.markFailed(
        event.id,
        claimToken,
        nextAttemptCount,
        formatPublishError(event.id, result),
      );
    }

    return {
      processed: pendingEvents.length,
      published,
      failed,
      skipped: false,
    };
  };
}

export const publishPendingOutboxBatch = buildPublishPendingOutboxBatch();

function buildEventSource(serviceName: string): string {
  return serviceName.replace(/[^a-zA-Z0-9]+/g, ".").replace(/^\.|\.$/g, "").toLowerCase();
}

function toEventBridgeDetail(event: EventOutboxRecord): Record<string, unknown> {
  return {
    eventId: event.id,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    occurredAt: event.occurredAt,
    data: event.payload,
  };
}

function formatPublishError(
  eventId: string,
  result: { ErrorCode?: string; ErrorMessage?: string } | undefined,
): string {
  if (!result) {
    return `Publishing ${eventId} failed with an unknown EventBridge response.`;
  }

  const code = result.ErrorCode ?? "UnknownError";
  const message = result.ErrorMessage ?? "No error message returned.";

  return `${code}: ${message}`;
}

async function defaultGetEventOutbox(): Promise<EventOutbox> {
  const db = await getDb();

  return createEventOutbox(db);
}

async function defaultPutEvents(entries: PutEventsRequestEntry[]): Promise<PutEventsCommandOutput> {
  return eventBridgeClient.send(
    new PutEventsCommand({
      Entries: entries,
    }),
  );
}
