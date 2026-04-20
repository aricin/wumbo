import assert from "node:assert/strict";
import test from "node:test";

import { buildResendWebhookHandler } from "../resend";

test("resend webhook records complaint-driven promotional unsubscribe state", async () => {
  const recorded: Array<Record<string, unknown>> = [];

  const handler = buildResendWebhookHandler({
    async verifyWebhook() {
      return {
        externalEventId: "svix-event-123",
        payload: {
          type: "email.complained",
          created_at: "2026-04-18T12:30:00.000Z",
          data: {
            email_id: "resend-email-123",
            to: ["user@example.com"],
          },
        },
      };
    },
    async getEmailStateRepository() {
      return {
        async recordProviderWebhook() {
          recorded.push({
            kind: "webhook",
          });
          return {
            status: "new",
          };
        },
        async applyProviderEvent(input: Record<string, unknown>) {
          recorded.push({
            kind: "delivery",
            ...input,
          });
          return {
            id: "delivery-123",
          };
        },
        async upsertPromotionalUnsubscribe(input: Record<string, unknown>) {
          recorded.push({
            kind: "unsubscribe",
            ...input,
          });
        },
        async recordPromotionalUnsubscribeEvent(input: Record<string, unknown>) {
          recorded.push({
            kind: "unsubscribe_event",
            ...input,
          });
        },
        async markProviderWebhookProcessed(input: string) {
          recorded.push({
            kind: "processed",
            externalEventId: input,
          });
        },
      } as never;
    },
  });

  const response = await handler({
    body: JSON.stringify({
      example: true,
    }),
    isBase64Encoded: false,
    headers: {},
  } as never);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    recorded.map((entry) => entry.kind),
    ["webhook", "delivery", "unsubscribe", "unsubscribe_event", "processed"],
  );
});

test("resend webhook dedupes already-recorded events", async () => {
  let applyCalls = 0;

  const handler = buildResendWebhookHandler({
    async verifyWebhook() {
      return {
        externalEventId: "svix-event-456",
        payload: {
          type: "email.delivered",
          created_at: "2026-04-18T12:30:00.000Z",
          data: {
            email_id: "resend-email-456",
            to: ["user@example.com"],
          },
        },
      };
    },
    async getEmailStateRepository() {
      return {
        async recordProviderWebhook() {
          return {
            status: "processed",
          };
        },
        async applyProviderEvent() {
          applyCalls += 1;
          return null;
        },
      } as never;
    },
  });

  const response = await handler({
    body: "{}",
    isBase64Encoded: false,
    headers: {},
  } as never);

  assert.equal(response.statusCode, 200);
  assert.equal(applyCalls, 0);
});

test("resend webhook resumes processing when a prior attempt recorded but did not finish", async () => {
  let applyCalls = 0;
  let processedCalls = 0;

  const handler = buildResendWebhookHandler({
    async verifyWebhook() {
      return {
        externalEventId: "svix-event-789",
        payload: {
          type: "email.delivered",
          created_at: "2026-04-18T12:30:00.000Z",
          data: {
            email_id: "resend-email-789",
            to: ["user@example.com"],
          },
        },
      };
    },
    async getEmailStateRepository() {
      return {
        async recordProviderWebhook() {
          return {
            status: "pending",
          };
        },
        async applyProviderEvent() {
          applyCalls += 1;
          return null;
        },
        async markProviderWebhookProcessed() {
          processedCalls += 1;
        },
      } as never;
    },
  });

  const response = await handler({
    body: "{}",
    isBase64Encoded: false,
    headers: {},
  } as never);

  assert.equal(response.statusCode, 200);
  assert.equal(applyCalls, 1);
  assert.equal(processedCalls, 1);
});
