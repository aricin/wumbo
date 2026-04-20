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
import {
  getHeader,
  getRequestMethod,
  htmlResponse,
  readRequestBody,
  textResponse,
} from "../../shared/http/api-gateway";

/**
 * Unsubscribe security notes live in
 * `wumbo-email/docs/UNSUBSCRIBE_ENDPOINT_SECURITY.md`.
 *
 * The authorization model is the opaque unsubscribe token. The endpoint is
 * intentionally public, but only a valid token plus a compliant one-click POST
 * should be able to change subscription state.
 */

interface UnsubscribeHandlerDependencies {
  getEmailStateRepository?: () => Promise<EmailStateRepository>;
  now?: () => Date;
}

export function buildUnsubscribeHandler({
  getEmailStateRepository = defaultGetEmailStateRepository,
  now = () => new Date(),
}: UnsubscribeHandlerDependencies = {}) {
  return async function handler(
    event: APIGatewayProxyEvent,
  ): Promise<APIGatewayProxyResult> {
    const token = event.pathParameters?.token?.trim();

    if (!token) {
      return textResponse("Missing unsubscribe token.", 400);
    }

    const repository = await getEmailStateRepository();
    const delivery = await repository.findDeliveryByUnsubscribeToken(token);

    if (!delivery || delivery.classification !== "promotional") {
      return htmlResponse(renderMissingTokenPage(), 404);
    }

    const method = getRequestMethod(event);

    if (method === "POST") {
      if (!isValidOneClickUnsubscribeRequest(event)) {
        return textResponse("invalid unsubscribe request", 400);
      }

      const occurredAt = now();

      await repository.upsertPromotionalUnsubscribe({
        email: delivery.recipientEmail,
        source: "one_click",
        deliveryId: delivery.id,
        reason: "list_unsubscribe",
        unsubscribedAt: occurredAt,
      });
      await repository.recordPromotionalUnsubscribeEvent({
        deliveryId: delivery.id,
        source: "unsubscribe_endpoint",
        occurredAt,
        payload: {
          method: "POST",
          oneClick: true,
        },
      });

      return {
        statusCode: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
        body: "",
      };
    }

    const alreadyUnsubscribed = await repository.isPromotionalUnsubscribed(
      delivery.recipientEmail,
    );

    return htmlResponse(
      alreadyUnsubscribed
        ? renderAlreadyUnsubscribedPage(delivery.recipientEmail)
        : renderConfirmUnsubscribePage(token, delivery.recipientEmail),
      200,
      {
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
      },
    );
  };
}

const unsubscribeHandler = buildUnsubscribeHandler();

export const handler: APIGatewayProxyHandler = async (event) => unsubscribeHandler(event);

async function defaultGetEmailStateRepository(): Promise<EmailStateRepository> {
  const db = await getDb();
  return createEmailStateRepository(db);
}

function renderConfirmUnsubscribePage(token: string, email: string): string {
  const safeEmail = escapeHtml(email);

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\" />",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    "<title>Unsubscribe from Wumbo emails</title>",
    "<style>body{font-family:Georgia,serif;background:#f7f1e8;color:#1f1a17;padding:32px}main{max-width:560px;margin:0 auto;background:#fffaf2;border:1px solid #dbcdb6;border-radius:16px;padding:32px}button{background:#1f1a17;color:#fffaf2;border:0;border-radius:999px;padding:12px 20px;font:inherit;cursor:pointer}</style>",
    "</head>",
    "<body>",
    "<main>",
    "<h1>Unsubscribe from promotional email</h1>",
    `<p>${safeEmail} will stop receiving promotional email from Wumbo. Transactional email like receipts, security notices, and account messages will still be sent.</p>`,
    "<form method=\"post\">",
    "<input type=\"hidden\" name=\"List-Unsubscribe\" value=\"One-Click\" />",
    "<button type=\"submit\">Unsubscribe</button>",
    "</form>",
    "</main>",
    "</body>",
    "</html>",
  ].join("");
}

function renderAlreadyUnsubscribedPage(email: string): string {
  const safeEmail = escapeHtml(email);

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><title>Already unsubscribed</title></head>",
    "<body style=\"font-family:Georgia,serif;background:#f7f1e8;color:#1f1a17;padding:32px\">",
    "<main style=\"max-width:560px;margin:0 auto;background:#fffaf2;border:1px solid #dbcdb6;border-radius:16px;padding:32px\">",
    "<h1>You are already unsubscribed</h1>",
    `<p>${safeEmail} is already opted out of promotional email from Wumbo.</p>`,
    "</main>",
    "</body>",
    "</html>",
  ].join("");
}

function renderMissingTokenPage(): string {
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><title>Unsubscribe link not found</title></head>",
    "<body style=\"font-family:Georgia,serif;background:#f7f1e8;color:#1f1a17;padding:32px\">",
    "<main style=\"max-width:560px;margin:0 auto;background:#fffaf2;border:1px solid #dbcdb6;border-radius:16px;padding:32px\">",
    "<h1>Unsubscribe link not found</h1>",
    "<p>This unsubscribe link is missing or no longer valid.</p>",
    "</main>",
    "</body>",
    "</html>",
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function isValidOneClickUnsubscribeRequest(event: APIGatewayProxyEvent): boolean {
  const contentType = getHeader(event.headers, "content-type")?.toLowerCase();
  const body = readRequestBody(event);

  if (!contentType || body.trim() === "") {
    return false;
  }

  if (contentType.startsWith("application/x-www-form-urlencoded")) {
    return new URLSearchParams(body).get("List-Unsubscribe") === "One-Click";
  }

  if (contentType.startsWith("multipart/form-data")) {
    return (
      /name="List-Unsubscribe"/i.test(body) &&
      /\r?\n\r?\nOne-Click(?:\r?\n|--)/.test(body)
    );
  }

  return false;
}
