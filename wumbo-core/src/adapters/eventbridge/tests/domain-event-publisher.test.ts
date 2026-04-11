import assert from "node:assert/strict";
import { test } from "node:test";

import type { PutEventsCommandOutput, PutEventsRequestEntry } from "@aws-sdk/client-eventbridge";

import { buildPublishPendingOutboxBatch } from "../domain-event-publisher";
import type { EventOutbox, EventOutboxRecord } from "../../../domain/ports/event-outbox";
import type { RuntimeConfig } from "../../../shared/config/runtime";

test("publishPendingOutboxBatch skips publishing when no event bus is configured", async () => {
  let claimCalled = false;
  const publishPendingOutboxBatch = buildPublishPendingOutboxBatch({
    getConfig: () => ({
      serviceName: "wumbo-core",
      environmentName: "dev",
      publisherBatchSize: 10,
      publisherClaimTimeoutSeconds: 120,
      allowDevIdentityHeader: true,
    }),
    getEventOutbox: async () =>
      createEventOutboxStub({
        claimPendingImpl: async () => {
          claimCalled = true;
          return [];
        },
      }),
  });

  const result = await publishPendingOutboxBatch();

  assert.deepEqual(result, {
    processed: 0,
    published: 0,
    failed: 0,
    skipped: true,
    reason: "EVENT_BUS_NAME is not configured.",
  });
  assert.equal(claimCalled, false);
});

test("publishPendingOutboxBatch claims a batch and marks each result with the same claim token", async () => {
  const claimInputs: Array<{
    limit: number;
    claimToken: string;
    claimedAt: string;
    staleBefore: string;
  }> = [];
  const markedPublished: Array<{ eventId: string; claimToken: string; nextAttemptCount: number }> = [];
  const markedFailed: Array<{
    eventId: string;
    claimToken: string;
    nextAttemptCount: number;
    errorMessage: string;
  }> = [];
  const publishedEntries: PutEventsRequestEntry[][] = [];
  const now = new Date("2026-04-05T18:00:00.000Z");
  const events: EventOutboxRecord[] = [
    createEventRecord({
      id: "event-1",
      occurredAt: "2026-04-05T17:59:00.000Z",
      publishAttempts: 0,
      payload: {
        propertyId: "property-1",
      },
    }),
    createEventRecord({
      id: "event-2",
      occurredAt: "2026-04-05T17:59:30.000Z",
      publishAttempts: 2,
      payload: {
        propertyId: "property-2",
      },
    }),
  ];

  const publishPendingOutboxBatch = buildPublishPendingOutboxBatch({
    getConfig: () =>
      createConfig({
        eventBusName: "wumbo-dev-bus",
        publisherBatchSize: 5,
        publisherClaimTimeoutSeconds: 120,
      }),
    getEventOutbox: async () =>
      createEventOutboxStub({
        claimPendingImpl: async (input) => {
          claimInputs.push(input);
          return events;
        },
        markPublishedImpl: async (eventId, claimToken, nextAttemptCount) => {
          markedPublished.push({
            eventId,
            claimToken,
            nextAttemptCount,
          });
        },
        markFailedImpl: async (eventId, claimToken, nextAttemptCount, errorMessage) => {
          markedFailed.push({
            eventId,
            claimToken,
            nextAttemptCount,
            errorMessage,
          });
        },
      }),
    putEvents: async (entries) => {
      publishedEntries.push(entries);

      return {
        $metadata: {},
        Entries: [
          {
            EventId: "aws-event-1",
          },
          {
            ErrorCode: "InternalFailure",
            ErrorMessage: "temporary outage",
          },
        ],
      } as PutEventsCommandOutput;
    },
    createClaimToken: () => "claim-123",
    getCurrentTime: () => now,
  });

  const result = await publishPendingOutboxBatch();

  assert.deepEqual(result, {
    processed: 2,
    published: 1,
    failed: 1,
    skipped: false,
  });
  assert.deepEqual(claimInputs, [
    {
      limit: 5,
      claimToken: "claim-123",
      claimedAt: "2026-04-05T18:00:00.000Z",
      staleBefore: "2026-04-05T17:58:00.000Z",
    },
  ]);
  assert.equal(publishedEntries.length, 1);
  assert.deepEqual(
    publishedEntries[0]?.map((entry) => ({
      eventBusName: entry.EventBusName,
      source: entry.Source,
      detailType: entry.DetailType,
      time: entry.Time?.toISOString(),
      detail: JSON.parse(entry.Detail ?? "{}"),
    })),
    [
      {
        eventBusName: "wumbo-dev-bus",
        source: "wumbo.core",
        detailType: "test-event.v1",
        time: "2026-04-05T17:59:00.000Z",
        detail: {
          eventId: "event-1",
          aggregateType: "property",
          aggregateId: "property-1",
          occurredAt: "2026-04-05T17:59:00.000Z",
          data: {
            propertyId: "property-1",
          },
        },
      },
      {
        eventBusName: "wumbo-dev-bus",
        source: "wumbo.core",
        detailType: "test-event.v1",
        time: "2026-04-05T17:59:30.000Z",
        detail: {
          eventId: "event-2",
          aggregateType: "property",
          aggregateId: "property-1",
          occurredAt: "2026-04-05T17:59:30.000Z",
          data: {
            propertyId: "property-2",
          },
        },
      },
    ],
  );
  assert.deepEqual(markedPublished, [
    {
      eventId: "event-1",
      claimToken: "claim-123",
      nextAttemptCount: 1,
    },
  ]);
  assert.deepEqual(markedFailed, [
    {
      eventId: "event-2",
      claimToken: "claim-123",
      nextAttemptCount: 3,
      errorMessage: "InternalFailure: temporary outage",
    },
  ]);
});

test("publishPendingOutboxBatch leaves claimed rows untouched when the EventBridge call throws", async () => {
  let marked = false;
  const publishPendingOutboxBatch = buildPublishPendingOutboxBatch({
    getConfig: () =>
      createConfig({
        eventBusName: "wumbo-dev-bus",
      }),
    getEventOutbox: async () =>
      createEventOutboxStub({
        claimPendingImpl: async () => [createEventRecord()],
        markPublishedImpl: async () => {
          marked = true;
        },
        markFailedImpl: async () => {
          marked = true;
        },
      }),
    putEvents: async () => {
      throw new Error("EventBridge unavailable");
    },
    createClaimToken: () => "claim-transport-failure",
    getCurrentTime: () => new Date("2026-04-05T18:00:00.000Z"),
  });

  await assert.rejects(() => publishPendingOutboxBatch(), /EventBridge unavailable/);
  assert.equal(marked, false);
});

function createConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    serviceName: "wumbo-core",
    environmentName: "dev",
    eventBusName: "wumbo-dev-bus",
    publisherBatchSize: 10,
    publisherClaimTimeoutSeconds: 120,
    allowDevIdentityHeader: true,
    ...overrides,
  };
}

function createEventRecord(overrides: Partial<EventOutboxRecord> = {}): EventOutboxRecord {
  return {
    id: "event-1",
    eventName: "test-event.v1",
    aggregateType: "property",
    aggregateId: "property-1",
    occurredAt: "2026-04-05T17:59:00.000Z",
    payload: {
      propertyId: "property-1",
    },
    publishAttempts: 0,
    ...overrides,
  };
}

function createEventOutboxStub({
  claimPendingImpl = async () => [],
  markPublishedImpl = async () => {},
  markFailedImpl = async () => {},
}: {
  claimPendingImpl?: EventOutbox["claimPending"];
  markPublishedImpl?: EventOutbox["markPublished"];
  markFailedImpl?: EventOutbox["markFailed"];
}): EventOutbox {
  return {
    async enqueue(): Promise<void> {},
    claimPending: claimPendingImpl,
    markPublished: markPublishedImpl,
    markFailed: markFailedImpl,
  };
}
