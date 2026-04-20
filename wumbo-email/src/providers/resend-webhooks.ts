import { Webhook } from "svix";
import type { APIGatewayProxyEvent } from "aws-lambda";

import { getSecretString } from "../shared/aws/secrets";
import { getRuntimeConfig } from "../shared/config/runtime";
import { getHeader } from "../shared/http/api-gateway";

/**
 * Resend recommends verifying every webhook with the endpoint-specific signing
 * secret and the raw request body. This module centralizes that policy for
 * `wumbo-email`, along with header validation and supported-event checks.
 *
 * References:
 * - https://resend.com/docs/webhooks/verify-webhooks-requests
 * - https://resend.com/docs/webhooks/introduction
 * - See `wumbo-email/docs/RESEND_WEBHOOK_SECURITY.md` for the full service-level
 *   design and retry/idempotency notes.
 */
export type ResendWebhookEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.failed"
  | "email.bounced"
  | "email.complained"
  | "email.suppressed";

export interface ResendWebhookPayload {
  type: ResendWebhookEventType;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
    suppressed?: {
      type?: string;
      message?: string;
    };
  } & Record<string, unknown>;
}

export interface VerifiedResendWebhook {
  externalEventId: string;
  payload: ResendWebhookPayload;
}

export async function verifyResendWebhook(
  event: APIGatewayProxyEvent,
  rawBody: string,
): Promise<VerifiedResendWebhook> {
  const svixId = requireHeader(event, "svix-id");
  const svixTimestamp = requireHeader(event, "svix-timestamp");
  const svixSignature = requireHeader(event, "svix-signature");
  const webhookSecret = await getResendWebhookSecret();

  const webhook = new Webhook(webhookSecret);
  const verified = webhook.verify(rawBody, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as ResendWebhookPayload;

  assertSupportedWebhook(verified);

  return {
    externalEventId: svixId,
    payload: verified,
  };
}

export function getResendWebhookRecipient(
  payload: ResendWebhookPayload,
): string | undefined {
  const candidate = payload.data.to?.[0];

  if (typeof candidate !== "string" || candidate.trim() === "") {
    return undefined;
  }

  return candidate.trim().toLowerCase();
}

export function mapResendWebhookStatus(
  eventType: ResendWebhookEventType,
):
  | "delivered"
  | "delivery_delayed"
  | "failed"
  | "bounced"
  | "complained"
  | "suppressed"
  | "sent" {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delivery_delayed";
    case "email.failed":
      return "failed";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.suppressed":
      return "suppressed";
    default:
      return assertNever(eventType);
  }
}

async function getResendWebhookSecret(): Promise<string> {
  const config = getRuntimeConfig();

  if (config.resendWebhookSecret) {
    return config.resendWebhookSecret;
  }

  if (!config.resendWebhookSecretArn) {
    throw new Error(
      "Resend webhook secret is not configured. Set RESEND_WEBHOOK_SECRET or RESEND_WEBHOOK_SECRET_ARN.",
    );
  }

  return getSecretString(config.resendWebhookSecretArn);
}

function requireHeader(event: APIGatewayProxyEvent, name: string): string {
  const value = getHeader(event.headers, name)?.trim();

  if (!value) {
    throw new Error(`Missing required webhook header: ${name}`);
  }

  return value;
}

function assertSupportedWebhook(payload: unknown): asserts payload is ResendWebhookPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Webhook payload must be an object.");
  }

  if (!("type" in payload) || !("created_at" in payload) || !("data" in payload)) {
    throw new Error("Webhook payload is missing required fields.");
  }

  if (typeof payload.type !== "string") {
    throw new Error("Webhook payload type must be a string.");
  }

  if (
    payload.type !== "email.sent" &&
    payload.type !== "email.delivered" &&
    payload.type !== "email.delivery_delayed" &&
    payload.type !== "email.failed" &&
    payload.type !== "email.bounced" &&
    payload.type !== "email.complained" &&
    payload.type !== "email.suppressed"
  ) {
    throw new Error(`Unsupported webhook payload type: ${String(payload.type)}`);
  }

  if (typeof payload.created_at !== "string" || payload.created_at.trim() === "") {
    throw new Error("Webhook payload created_at must be a non-empty string.");
  }

  if (!payload.data || typeof payload.data !== "object") {
    throw new Error("Webhook payload data must be an object.");
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled webhook event type: ${String(value)}`);
}
