import type { EmailProvider } from "../../providers/email-provider";
import type { EmailStateRepository } from "../../db/repositories/email-state-repository";
import { getRuntimeConfig } from "../../shared/config/runtime";
import { getDb } from "../../db/client/connection";
import { createEmailStateRepository } from "../../db/repositories/email-state-repository";
import { resolveSenderProfile } from "../sender-profiles";
import type { EmailTypeDefinition } from "../types";
import { renderWelcomeEmailTemplate } from "./welcome-email-template";

export interface SendWelcomeEmailInput {
  eventId: string;
  identityUserId: string;
  cognitoSubject: string;
  email: string;
}

interface SendWelcomeEmailDependencies {
  emailProvider: EmailProvider;
  getConfig?: typeof getRuntimeConfig;
  getEmailStateRepository?: () => Promise<EmailStateRepository>;
}

export const welcomeEmailDefinition: EmailTypeDefinition = {
  type: "welcome",
  classification: "promotional",
  fromProfile: "default",
};

export function buildSendWelcomeEmail({
  emailProvider,
  getConfig = getRuntimeConfig,
  getEmailStateRepository = defaultGetEmailStateRepository,
}: SendWelcomeEmailDependencies) {
  return async function sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<void> {
    const config = getConfig();
    const emailStateRepository = await getEmailStateRepository();
    const recipientEmail = normalizeEmail(input.email);
    const senderProfile = resolveSenderProfile(welcomeEmailDefinition.fromProfile, config);
    const delivery = await emailStateRepository.getOrCreateDelivery({
      deliveryKey: `${welcomeEmailDefinition.type}:${input.eventId}`,
      emailType: welcomeEmailDefinition.type,
      classification: welcomeEmailDefinition.classification,
      sourceEventId: input.eventId,
      sourceEventType: "identity.user.registered.v1",
      recipientEmail,
      recipientIdentityUserId: input.identityUserId,
      senderProfile: welcomeEmailDefinition.fromProfile,
      fromEmail: senderProfile.fromEmail,
      replyToEmail: senderProfile.replyToEmail,
    });

    if (isTerminalStatus(delivery.latestStatus)) {
      return;
    }

    if (await emailStateRepository.isPromotionalUnsubscribed(recipientEmail)) {
      await emailStateRepository.markSkippedUnsubscribed(delivery.id);
      return;
    }

    if (!delivery.unsubscribeToken) {
      throw new Error("Promotional email delivery is missing an unsubscribe token.");
    }

    if (!config.publicBaseUrl) {
      throw new Error(
        "Promotional email delivery requires PUBLIC_BASE_URL to build unsubscribe links.",
      );
    }

    const unsubscribeUrl = buildUnsubscribeUrl(config.publicBaseUrl, delivery.unsubscribeToken);
    const content = renderWelcomeEmailTemplate({
      unsubscribeUrl,
    });

    const result = await emailProvider.send({
      to: recipientEmail,
      from: senderProfile.fromEmail,
      replyTo: senderProfile.replyToEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: delivery.deliveryKey,
      tags: [
        { name: "email_type", value: welcomeEmailDefinition.type },
        { name: "classification", value: welcomeEmailDefinition.classification },
        { name: "event", value: "identity_user_registered_v1" },
      ],
      headers: buildPromotionalHeaders({
        fromEmail: senderProfile.fromEmail,
        unsubscribeUrl,
      }),
    });

    await emailStateRepository.markSent({
      deliveryId: delivery.id,
      providerMessageId: result.id,
    });
  };
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();

  if (normalized.length < 1) {
    throw new Error("email is required.");
  }

  return normalized;
}

function buildPromotionalHeaders(input: {
  fromEmail: string;
  unsubscribeUrl: string;
}): Record<string, string> {
  return {
    "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "List-ID": buildListId(input.fromEmail),
  };
}

function buildListId(fromEmail: string): string {
  const addressMatch = fromEmail.match(/<([^>]+)>/);
  const address = (addressMatch?.[1] ?? fromEmail).trim().toLowerCase();
  const domain = address.split("@")[1];

  if (!domain) {
    throw new Error(`Unable to determine sender domain from ${fromEmail}.`);
  }

  return `promotional.${domain}`;
}

function buildUnsubscribeUrl(publicBaseUrl: string, unsubscribeToken: string): string {
  const trimmedBaseUrl = publicBaseUrl.replace(/\/+$/, "");

  return `${trimmedBaseUrl}/unsubscribe/${unsubscribeToken}`;
}

function isTerminalStatus(status: string): boolean {
  return (
    status === "sent" ||
    status === "delivered" ||
    status === "delivery_delayed" ||
    status === "failed" ||
    status === "bounced" ||
    status === "complained" ||
    status === "suppressed" ||
    status === "skipped_unsubscribed"
  );
}

async function defaultGetEmailStateRepository(): Promise<EmailStateRepository> {
  const db = await getDb();
  return createEmailStateRepository(db);
}
