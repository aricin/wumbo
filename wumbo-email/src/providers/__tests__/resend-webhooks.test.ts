import assert from "node:assert/strict";
import test from "node:test";

import type { APIGatewayProxyEvent } from "aws-lambda";
import { Webhook } from "svix";

import { verifyResendWebhook } from "../resend-webhooks";
import { resetRuntimeConfigForTests } from "../../shared/config/runtime";

const webhookSecret = `whsec_${Buffer.from("wumbo-resend-webhook-secret").toString("base64")}`;
const validPayload = JSON.stringify({
  type: "email.delivered",
  created_at: "2026-04-18T18:32:11.000Z",
  data: {
    email_id: "resend-email-123",
    to: ["user@example.com"],
  },
});

test.afterEach(() => {
  delete process.env.SERVICE_NAME;
  delete process.env.APP_ENV;
  delete process.env.PUBLIC_BASE_URL;
  delete process.env.DEFAULT_FROM_EMAIL;
  delete process.env.RESEND_WEBHOOK_SECRET;
  resetRuntimeConfigForTests();
});

test("verifyResendWebhook accepts a valid signed webhook", async () => {
  const event = buildSignedWebhookEvent(validPayload);

  const verified = await verifyResendWebhook(event, validPayload);

  assert.equal(verified.externalEventId, "msg_valid");
  assert.equal(verified.payload.type, "email.delivered");
  assert.equal(verified.payload.data.email_id, "resend-email-123");
});

test("verifyResendWebhook rejects a webhook when the body does not match the signature", async () => {
  const event = buildSignedWebhookEvent(validPayload);

  await assert.rejects(
    () =>
      verifyResendWebhook(
        event,
        JSON.stringify({
          ...JSON.parse(validPayload),
          created_at: "2026-04-18T18:33:11.000Z",
        }),
      ),
    /No matching signature found/,
  );
});

test("verifyResendWebhook rejects stale webhook timestamps", async () => {
  const event = buildSignedWebhookEvent(
    validPayload,
    new Date(Date.now() - 10 * 60 * 1000),
    "msg_old",
  );

  await assert.rejects(
    () => verifyResendWebhook(event, validPayload),
    /Message timestamp too old/,
  );
});

test("verifyResendWebhook requires the Resend signature headers", async () => {
  const event = buildSignedWebhookEvent(validPayload);
  delete event.headers?.["svix-signature"];

  await assert.rejects(
    () => verifyResendWebhook(event, validPayload),
    /Missing required webhook header: svix-signature/,
  );
});

function buildSignedWebhookEvent(
  payload: string,
  timestamp = new Date(),
  messageId = "msg_valid",
): APIGatewayProxyEvent {
  process.env.SERVICE_NAME = "wumbo-email";
  process.env.APP_ENV = "test";
  process.env.PUBLIC_BASE_URL = "https://email.test.wumbostack.com";
  process.env.DEFAULT_FROM_EMAIL = "no-reply@test.wumbostack.com";
  process.env.RESEND_WEBHOOK_SECRET = webhookSecret;
  resetRuntimeConfigForTests();

  const webhook = new Webhook(webhookSecret);
  const signature = webhook.sign(messageId, timestamp, payload);

  return {
    headers: {
      "content-type": "application/json",
      "svix-id": messageId,
      "svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "svix-signature": signature,
    },
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/webhooks/resend",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: "/webhooks/resend",
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      httpMethod: "POST",
      path: "/test/webhooks/resend",
      protocol: "HTTP/1.1",
      requestId: "request-id",
      requestTime: "18/Apr/2026:18:32:11 +0000",
      requestTimeEpoch: timestamp.getTime(),
      resourceId: "resource-id",
      resourcePath: "/webhooks/resend",
      stage: "test",
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "127.0.0.1",
        user: null,
        userAgent: "node:test",
        userArn: null,
        clientCert: null,
      },
      authorizer: null,
    },
    body: payload,
  };
}
