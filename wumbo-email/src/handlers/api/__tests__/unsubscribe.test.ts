import assert from "node:assert/strict";
import test from "node:test";

import { buildUnsubscribeHandler } from "../unsubscribe";

test("unsubscribe GET renders a confirmation page", async () => {
  const handler = buildUnsubscribeHandler({
    async getEmailStateRepository() {
      return {
        async findDeliveryByUnsubscribeToken() {
          return {
            id: "delivery-123",
            classification: "promotional",
            recipientEmail: "user@example.com",
          };
        },
        async isPromotionalUnsubscribed() {
          return false;
        },
      } as never;
    },
  });

  const response = await handler({
    pathParameters: {
      token: "token-123",
    },
    httpMethod: "GET",
  } as never);

  assert.equal(response.statusCode, 200);
  assert.match(response.body ?? "", /Unsubscribe from promotional email/);
  assert.match(response.body ?? "", /user@example.com/);
  assert.match(response.body ?? "", /List-Unsubscribe/);
});

test("unsubscribe POST records a promotional opt-out", async () => {
  const recorded: Array<Record<string, unknown>> = [];

  const handler = buildUnsubscribeHandler({
    now: () => new Date("2026-04-18T12:00:00.000Z"),
    async getEmailStateRepository() {
      return {
        async findDeliveryByUnsubscribeToken() {
          return {
            id: "delivery-456",
            classification: "promotional",
            recipientEmail: "user@example.com",
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
            kind: "event",
            ...input,
          });
        },
      } as never;
    },
  });

  const response = await handler({
    pathParameters: {
      token: "token-456",
    },
    httpMethod: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "List-Unsubscribe=One-Click",
    isBase64Encoded: false,
  } as never);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, "");
  assert.equal(recorded.length, 2);
  assert.equal(recorded[0]?.kind, "unsubscribe");
  assert.equal(recorded[1]?.kind, "event");
});

test("unsubscribe POST rejects non-compliant one-click requests", async () => {
  const handler = buildUnsubscribeHandler({
    async getEmailStateRepository() {
      return {
        async findDeliveryByUnsubscribeToken() {
          return {
            id: "delivery-789",
            classification: "promotional",
            recipientEmail: "user@example.com",
          };
        },
      } as never;
    },
  });

  const response = await handler({
    pathParameters: {
      token: "token-789",
    },
    httpMethod: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: "{\"unexpected\":true}",
    isBase64Encoded: false,
  } as never);

  assert.equal(response.statusCode, 400);
});
