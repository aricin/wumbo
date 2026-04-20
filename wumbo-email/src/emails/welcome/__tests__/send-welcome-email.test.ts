import assert from "node:assert/strict";
import test from "node:test";

import { buildSendWelcomeEmail } from "../send-welcome-email";

test("sendWelcomeEmail sends a welcome email with the event id as the idempotency key", async () => {
  const sentInputs: Array<{
    to: string;
    from: string;
    replyTo?: string;
    subject: string;
    idempotencyKey?: string;
    headers?: Record<string, string>;
  }> = [];

  const sendWelcomeEmail = buildSendWelcomeEmail({
    emailProvider: {
      async send(input) {
        sentInputs.push({
          to: input.to,
          from: input.from,
          replyTo: input.replyTo,
          subject: input.subject,
          idempotencyKey: input.idempotencyKey,
          headers: input.headers,
        });

        return {
          id: "email-123",
        };
      },
    },
    getConfig() {
      return {
        serviceName: "wumbo-email",
        environmentName: "test",
        publicBaseUrl: "https://email.example.com",
        defaultFromEmail: "Wumbo <noreply@example.com>",
        defaultReplyToEmail: "support@example.com",
      };
    },
    async getEmailStateRepository() {
      return {
        async getOrCreateDelivery() {
          return {
            id: "delivery-123",
            deliveryKey: "welcome:event-123",
            emailType: "welcome",
            classification: "promotional",
            sourceEventId: "event-123",
            sourceEventType: "identity.user.registered.v1",
            recipientEmail: "user@example.com",
            recipientIdentityUserId: "identity-user-123",
            senderProfile: "default",
            fromEmail: "Wumbo <noreply@example.com>",
            replyToEmail: null,
            provider: "resend",
            providerMessageId: null,
            unsubscribeToken: "unsubscribe-token-123",
            latestStatus: "pending",
            latestStatusAt: new Date("2026-04-18T00:00:00.000Z"),
            skipReason: null,
            sentAt: null,
            createdAt: new Date("2026-04-18T00:00:00.000Z"),
            updatedAt: new Date("2026-04-18T00:00:00.000Z"),
          };
        },
        async isPromotionalUnsubscribed() {
          return false;
        },
        async markSent() {},
      } as never;
    },
  });

  await sendWelcomeEmail({
    eventId: "event-123",
    identityUserId: "identity-user-123",
    cognitoSubject: "subject-123",
    email: " USER@EXAMPLE.COM ",
  });

  assert.equal(sentInputs.length, 1);
  assert.equal(sentInputs[0]?.to, "user@example.com");
  assert.equal(sentInputs[0]?.from, "Wumbo <noreply@example.com>");
  assert.equal(sentInputs[0]?.replyTo, undefined);
  assert.equal(sentInputs[0]?.subject, "Welcome to Wumbo");
  assert.equal(sentInputs[0]?.idempotencyKey, "welcome:event-123");
  assert.equal(
    sentInputs[0]?.headers?.["List-Unsubscribe"],
    "<https://email.example.com/unsubscribe/unsubscribe-token-123>",
  );
});

test("sendWelcomeEmail skips promotional sends for unsubscribed recipients", async () => {
  let sendCalls = 0;
  let skippedDeliveryId: string | undefined;

  const sendWelcomeEmail = buildSendWelcomeEmail({
    emailProvider: {
      async send() {
        sendCalls += 1;

        return {
          id: "email-123",
        };
      },
    },
    getConfig() {
      return {
        serviceName: "wumbo-email",
        environmentName: "test",
        publicBaseUrl: "https://email.example.com",
        defaultFromEmail: "Wumbo <noreply@example.com>",
        defaultReplyToEmail: "support@example.com",
      };
    },
    async getEmailStateRepository() {
      return {
        async getOrCreateDelivery() {
          return {
            id: "delivery-456",
            deliveryKey: "welcome:event-456",
            emailType: "welcome",
            classification: "promotional",
            sourceEventId: "event-456",
            sourceEventType: "identity.user.registered.v1",
            recipientEmail: "user@example.com",
            recipientIdentityUserId: "identity-user-456",
            senderProfile: "default",
            fromEmail: "Wumbo <noreply@example.com>",
            replyToEmail: null,
            provider: "resend",
            providerMessageId: null,
            unsubscribeToken: "unsubscribe-token-456",
            latestStatus: "pending",
            latestStatusAt: new Date("2026-04-18T00:00:00.000Z"),
            skipReason: null,
            sentAt: null,
            createdAt: new Date("2026-04-18T00:00:00.000Z"),
            updatedAt: new Date("2026-04-18T00:00:00.000Z"),
          };
        },
        async isPromotionalUnsubscribed() {
          return true;
        },
        async markSkippedUnsubscribed(deliveryId: string) {
          skippedDeliveryId = deliveryId;
        },
      } as never;
    },
  });

  await sendWelcomeEmail({
    eventId: "event-456",
    identityUserId: "identity-user-456",
    cognitoSubject: "subject-456",
    email: "user@example.com",
  });

  assert.equal(sendCalls, 0);
  assert.equal(skippedDeliveryId, "delivery-456");
});
