import { randomBytes, randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import type { Database } from "../client/connection";
import {
  emailDeliveries,
  emailDeliveryEvents,
  promotionalUnsubscribes,
  providerWebhookEvents,
  type EmailDeliveryRow,
} from "../schema";

export type EmailClassification = "transactional" | "promotional";
export type EmailDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "failed"
  | "bounced"
  | "complained"
  | "suppressed"
  | "skipped_unsubscribed";

export interface CreateEmailDeliveryInput {
  deliveryKey: string;
  emailType: string;
  classification: EmailClassification;
  sourceEventId: string;
  sourceEventType: string;
  recipientEmail: string;
  recipientIdentityUserId?: string;
  senderProfile: string;
  fromEmail: string;
  replyToEmail?: string;
}

export interface RecordProviderWebhookInput {
  externalEventId: string;
  eventType: string;
  providerMessageId?: string;
  payload: Record<string, unknown>;
  webhookCreatedAt?: Date;
}

export interface RecordProviderWebhookResult {
  status: "new" | "pending" | "processed";
}

export interface ApplyProviderEventInput {
  providerMessageId: string;
  eventType: string;
  status: Exclude<EmailDeliveryStatus, "pending" | "skipped_unsubscribed">;
  payload: Record<string, unknown>;
  occurredAt: Date;
  externalEventId: string;
}

export function createEmailStateRepository(db: Database) {
  return {
    async getOrCreateDelivery(input: CreateEmailDeliveryInput): Promise<EmailDeliveryRow> {
      const existing = await db.query.emailDeliveries.findFirst({
        where: eq(emailDeliveries.deliveryKey, input.deliveryKey),
      });

      if (existing) {
        return existing;
      }

      try {
        const [created] = await db
          .insert(emailDeliveries)
          .values({
            id: randomUUID(),
            deliveryKey: input.deliveryKey,
            emailType: input.emailType,
            classification: input.classification,
            sourceEventId: input.sourceEventId,
            sourceEventType: input.sourceEventType,
            recipientEmail: normalizeEmail(input.recipientEmail),
            recipientIdentityUserId: input.recipientIdentityUserId,
            senderProfile: input.senderProfile,
            fromEmail: input.fromEmail,
            replyToEmail: input.replyToEmail,
            unsubscribeToken:
              input.classification === "promotional" ? randomUnsubscribeToken() : null,
            latestStatus: "pending",
          })
          .returning();

        if (created) {
          return created;
        }
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }

      const createdElsewhere = await db.query.emailDeliveries.findFirst({
        where: eq(emailDeliveries.deliveryKey, input.deliveryKey),
      });

      if (!createdElsewhere) {
        throw new Error(`Expected delivery ${input.deliveryKey} to exist after insert attempt.`);
      }

      return createdElsewhere;
    },

    async isPromotionalUnsubscribed(email: string): Promise<boolean> {
      const existing = await db.query.promotionalUnsubscribes.findFirst({
        where: eq(promotionalUnsubscribes.email, normalizeEmail(email)),
      });

      return Boolean(existing);
    },

    async markSkippedUnsubscribed(deliveryId: string, occurredAt = new Date()): Promise<void> {
      await db
        .update(emailDeliveries)
        .set({
          latestStatus: "skipped_unsubscribed",
          latestStatusAt: occurredAt,
          skipReason: "promotional_unsubscribed",
          updatedAt: occurredAt,
        })
        .where(eq(emailDeliveries.id, deliveryId));

      await insertDeliveryEvent(db, {
        deliveryId,
        eventType: "delivery.skipped_unsubscribed",
        eventSource: "application",
        statusAfterEvent: "skipped_unsubscribed",
        occurredAt,
        payload: {
          reason: "promotional_unsubscribed",
        },
      });
    },

    async markSent(input: {
      deliveryId: string;
      providerMessageId: string;
      occurredAt?: Date;
    }): Promise<void> {
      const occurredAt = input.occurredAt ?? new Date();

      await db
        .update(emailDeliveries)
        .set({
          providerMessageId: input.providerMessageId,
          latestStatus: "sent",
          latestStatusAt: occurredAt,
          sentAt: occurredAt,
          updatedAt: occurredAt,
          skipReason: null,
        })
        .where(eq(emailDeliveries.id, input.deliveryId));

      await insertDeliveryEvent(db, {
        deliveryId: input.deliveryId,
        eventType: "email.sent",
        eventSource: "application",
        statusAfterEvent: "sent",
        occurredAt,
        payload: {
          providerMessageId: input.providerMessageId,
        },
      });
    },

    async findDeliveryByUnsubscribeToken(token: string): Promise<EmailDeliveryRow | null> {
      const delivery = await db.query.emailDeliveries.findFirst({
        where: eq(emailDeliveries.unsubscribeToken, token),
      });

      return delivery ?? null;
    },

    async upsertPromotionalUnsubscribe(input: {
      email: string;
      source: string;
      deliveryId?: string;
      reason?: string;
      unsubscribedAt?: Date;
    }): Promise<void> {
      const unsubscribedAt = input.unsubscribedAt ?? new Date();

      await db
        .insert(promotionalUnsubscribes)
        .values({
          email: normalizeEmail(input.email),
          source: input.source,
          reason: input.reason,
          deliveryId: input.deliveryId,
          unsubscribedAt,
          updatedAt: unsubscribedAt,
        })
        .onConflictDoUpdate({
          target: promotionalUnsubscribes.email,
          set: {
            source: input.source,
            reason: input.reason,
            deliveryId: input.deliveryId,
            unsubscribedAt,
            updatedAt: unsubscribedAt,
          },
        });
    },

    async recordPromotionalUnsubscribeEvent(input: {
      deliveryId: string;
      source: string;
      occurredAt?: Date;
      payload?: Record<string, unknown>;
    }): Promise<void> {
      const occurredAt = input.occurredAt ?? new Date();

      await insertDeliveryEvent(db, {
        deliveryId: input.deliveryId,
        eventType: "promotional.unsubscribed",
        eventSource: input.source,
        statusAfterEvent: null,
        occurredAt,
        payload: input.payload,
      });
    },

    async recordProviderWebhook(
      input: RecordProviderWebhookInput,
    ): Promise<RecordProviderWebhookResult> {
      const [inserted] = await db
        .insert(providerWebhookEvents)
        .values({
          id: randomUUID(),
          provider: "resend",
          externalEventId: input.externalEventId,
          eventType: input.eventType,
          providerMessageId: input.providerMessageId,
          payload: input.payload,
          webhookCreatedAt: input.webhookCreatedAt,
        })
        .onConflictDoNothing()
        .returning({
          id: providerWebhookEvents.id,
        });

      if (inserted) {
        return {
          status: "new",
        };
      }

      const existing = await db.query.providerWebhookEvents.findFirst({
        where: eq(providerWebhookEvents.externalEventId, input.externalEventId),
        columns: {
          processedAt: true,
        },
      });

      if (!existing) {
        throw new Error(
          `Expected provider webhook ${input.externalEventId} to exist after insert attempt.`,
        );
      }

      return {
        status: existing.processedAt ? "processed" : "pending",
      };
    },

    async markProviderWebhookProcessed(
      externalEventId: string,
      processedAt = new Date(),
    ): Promise<void> {
      await db
        .update(providerWebhookEvents)
        .set({
          processedAt,
        })
        .where(eq(providerWebhookEvents.externalEventId, externalEventId));
    },

    async applyProviderEvent(input: ApplyProviderEventInput): Promise<EmailDeliveryRow | null> {
      const delivery = await db.query.emailDeliveries.findFirst({
        where: eq(emailDeliveries.providerMessageId, input.providerMessageId),
      });

      if (!delivery) {
        return null;
      }

      const [updated] = await db
        .update(emailDeliveries)
        .set({
          latestStatus: input.status,
          latestStatusAt: input.occurredAt,
          updatedAt: input.occurredAt,
        })
        .where(eq(emailDeliveries.id, delivery.id))
        .returning();

      await insertDeliveryEvent(db, {
        deliveryId: delivery.id,
        eventType: input.eventType,
        eventSource: "provider_webhook",
        statusAfterEvent: input.status,
        externalEventId: input.externalEventId,
        occurredAt: input.occurredAt,
        payload: input.payload,
      });

      return updated ?? delivery;
    },
  };
}

export type EmailStateRepository = ReturnType<typeof createEmailStateRepository>;

interface InsertDeliveryEventInput {
  deliveryId: string;
  eventType: string;
  eventSource: string;
  statusAfterEvent: string | null;
  occurredAt: Date;
  externalEventId?: string;
  payload?: Record<string, unknown>;
}

async function insertDeliveryEvent(
  db: Database,
  input: InsertDeliveryEventInput,
): Promise<void> {
  try {
    await db.insert(emailDeliveryEvents).values({
      id: randomUUID(),
      deliveryId: input.deliveryId,
      eventType: input.eventType,
      eventSource: input.eventSource,
      statusAfterEvent: input.statusAfterEvent,
      externalEventId: input.externalEventId,
      payload: input.payload ?? null,
      occurredAt: input.occurredAt,
    });
  } catch (error) {
    if (input.externalEventId && isUniqueViolation(error)) {
      return;
    }

    throw error;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function randomUnsubscribeToken(): string {
  return randomBytes(24).toString("base64url");
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && error.code === "23505";
}
