import assert from "node:assert/strict";
import test from "node:test";

import { buildPublishPendingOutboxBatch } from "./publish-pending-events";

test("publishPendingOutboxBatch skips publishing when no event bus is configured", async () => {
  let outboxRequested = false;
  const publishPendingOutboxBatch = buildPublishPendingOutboxBatch({
    getConfig() {
      return {
        serviceName: "wumbo-identity",
        environmentName: "dev",
        publisherBatchSize: 10,
        publisherClaimTimeoutSeconds: 120,
      };
    },
    async getOutbox() {
      outboxRequested = true;
      throw new Error("Outbox should not be loaded when EventBridge is disabled.");
    },
  });

  const result = await publishPendingOutboxBatch();

  assert.deepEqual(result, {
    processed: 0,
    published: 0,
    failed: 0,
    skipped: true,
    reason: "EVENT_BUS_NAME is not configured.",
  });
  assert.equal(outboxRequested, false);
});

test("publishPendingOutboxBatch publishes claimed events and marks success and failure results", async () => {
  const markedPublished: unknown[] = [];
  const markedFailed: unknown[] = [];
  const putEventsEntries: unknown[] = [];
  const now = new Date("2026-04-17T12:00:00.000Z");

  const publishPendingOutboxBatch = buildPublishPendingOutboxBatch({
    getConfig() {
      return {
        serviceName: "wumbo-identity",
        environmentName: "dev",
        eventBusName: "wumbo-marketplace-dev-domain-events",
        publisherBatchSize: 10,
        publisherClaimTimeoutSeconds: 120,
      };
    },
    async getOutbox() {
      return {
        async enqueue() {
          throw new Error("enqueue should not be called while publishing pending events.");
        },
        async claimPending(input) {
          assert.deepEqual(input, {
            limit: 10,
            claimToken: "claim-123",
            claimedAt: "2026-04-17T12:00:00.000Z",
            staleBefore: "2026-04-17T11:58:00.000Z",
          });

          return [
            {
              id: "event-1",
              eventName: "identity.user.registered.v1",
              aggregateType: "identity-user",
              aggregateId: "identity-user-1",
              occurredAt: "2026-04-17T11:59:00.000Z",
              payload: {
                identityUserId: "identity-user-1",
              },
              publishAttempts: 0,
            },
            {
              id: "event-2",
              eventName: "identity.user.registered.v1",
              aggregateType: "identity-user",
              aggregateId: "identity-user-2",
              occurredAt: "2026-04-17T11:59:30.000Z",
              payload: {
                identityUserId: "identity-user-2",
              },
              publishAttempts: 2,
            },
          ];
        },
        async markPublished(eventId, claimToken, nextAttemptCount) {
          markedPublished.push({ eventId, claimToken, nextAttemptCount });
        },
        async markFailed(eventId, claimToken, nextAttemptCount, errorMessage) {
          markedFailed.push({ eventId, claimToken, nextAttemptCount, errorMessage });
        },
      };
    },
    async putEvents(entries) {
      putEventsEntries.push(...entries);

      return {
        $metadata: {
          httpStatusCode: 200,
        },
        FailedEntryCount: 1,
        Entries: [
          {
            EventId: "eb-event-1",
          },
          {
            ErrorCode: "InternalFailure",
            ErrorMessage: "Temporary issue",
          },
        ],
      };
    },
    createClaimToken() {
      return "claim-123";
    },
    getCurrentTime() {
      return now;
    },
  });

  const result = await publishPendingOutboxBatch();

  assert.equal(putEventsEntries.length, 2);
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
      errorMessage: "InternalFailure: Temporary issue",
    },
  ]);
  assert.deepEqual(result, {
    processed: 2,
    published: 1,
    failed: 1,
    skipped: false,
  });
});
