import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";

import { getDb } from "../../db/client/connection";
import {
  createEmailStateRepository,
  type EmailStateRepository,
} from "../../db/repositories/email-state-repository";
import { readRequestBody, textResponse } from "../../shared/http/api-gateway";
import {
  getResendWebhookRecipient,
  mapResendWebhookStatus,
  verifyResendWebhook,
} from "../../providers/resend-webhooks";

/**
 * Security and delivery notes for the Resend webhook flow live in
 * `wumbo-email/docs/RESEND_WEBHOOK_SECURITY.md`.
 *
 * This handler verifies the webhook before touching application state and only
 * acknowledges duplicates that have already been processed. If a prior attempt
 * inserted the webhook receipt but failed before completion, a retry with the
 * same `svix-id` is resumed instead of being silently dropped.
 */
interface ResendWebhookHandlerDependencies {
  getEmailStateRepository?: () => Promise<EmailStateRepository>;
  verifyWebhook?: typeof verifyResendWebhook;
}

export function buildResendWebhookHandler({
  getEmailStateRepository = defaultGetEmailStateRepository,
  verifyWebhook = verifyResendWebhook,
}: ResendWebhookHandlerDependencies = {}) {
  return async function handler(
    event: APIGatewayProxyEvent,
  ): Promise<APIGatewayProxyResult> {
    const rawBody = readRequestBody(event);
    const repository = await getEmailStateRepository();
    let verified;

    try {
      verified = await verifyWebhook(event, rawBody);
    } catch (error) {
      console.error("Failed to verify Resend webhook.", {
        error,
      });
      return textResponse("invalid webhook", 400);
    }

    try {
      const occurredAt = new Date(verified.payload.created_at);
      const providerMessageId =
        typeof verified.payload.data.email_id === "string" &&
        verified.payload.data.email_id.trim() !== ""
          ? verified.payload.data.email_id.trim()
          : undefined;

      const webhookReceipt = await repository.recordProviderWebhook({
        externalEventId: verified.externalEventId,
        eventType: verified.payload.type,
        providerMessageId,
        payload: verified.payload as unknown as Record<string, unknown>,
        webhookCreatedAt: Number.isNaN(occurredAt.getTime()) ? undefined : occurredAt,
      });

      if (webhookReceipt.status === "processed") {
        return textResponse("ok");
      }

      const normalizedOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
      const delivery =
        providerMessageId
          ? await repository.applyProviderEvent({
              providerMessageId,
              eventType: verified.payload.type,
              status: mapResendWebhookStatus(verified.payload.type),
              payload: verified.payload as unknown as Record<string, unknown>,
              occurredAt: normalizedOccurredAt,
              externalEventId: verified.externalEventId,
            })
          : null;

      if (verified.payload.type === "email.complained") {
        const recipientEmail = getResendWebhookRecipient(verified.payload);

        if (recipientEmail) {
          await repository.upsertPromotionalUnsubscribe({
            email: recipientEmail,
            source: "complained",
            deliveryId: delivery?.id,
            reason: "recipient_marked_as_spam",
            unsubscribedAt: normalizedOccurredAt,
          });

          if (delivery) {
            await repository.recordPromotionalUnsubscribeEvent({
              deliveryId: delivery.id,
              source: "provider_webhook",
              occurredAt: normalizedOccurredAt,
              payload: {
                type: verified.payload.type,
                externalEventId: verified.externalEventId,
              },
            });
          }
        }
      }

      await repository.markProviderWebhookProcessed(
        verified.externalEventId,
        new Date(),
      );

      return textResponse("ok");
    } catch (error) {
      console.error("Failed to process Resend webhook.", {
        externalEventId: verified.externalEventId,
        error,
      });
      return textResponse("internal webhook error", 500);
    }
  };
}

const resendWebhookHandler = buildResendWebhookHandler();

export const handler: APIGatewayProxyHandler = async (event) => resendWebhookHandler(event);

async function defaultGetEmailStateRepository(): Promise<EmailStateRepository> {
  const db = await getDb();
  return createEmailStateRepository(db);
}
