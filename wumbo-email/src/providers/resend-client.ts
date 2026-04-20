import type { EmailProvider, SendEmailInput, SendEmailResult } from "./email-provider";
import { getRuntimeConfig } from "../shared/config/runtime";
import { getSecretString } from "../shared/aws/secrets";

let cachedApiKey: string | undefined;

interface CreateResendEmailProviderDependencies {
  getConfig?: typeof getRuntimeConfig;
  getApiKey?: () => Promise<string>;
  fetchImpl?: typeof fetch;
}

interface ResendSendEmailResponse {
  id?: unknown;
}

export function createResendEmailProvider({
  getConfig = getRuntimeConfig,
  getApiKey = defaultGetApiKey,
  fetchImpl = fetch,
}: CreateResendEmailProviderDependencies = {}): EmailProvider {
  return {
    async send(input: SendEmailInput): Promise<SendEmailResult> {
      const config = getConfig();
      const apiKey = await getApiKey();

      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `${config.serviceName}/${config.environmentName}`,
          ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
          ...input.headers,
        },
        body: JSON.stringify({
          from: input.from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
          replyTo: input.replyTo,
          tags: input.tags,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Resend email send failed with status ${response.status}: ${await response.text()}`,
        );
      }

      const parsed = (await response.json()) as ResendSendEmailResponse;

      if (typeof parsed.id !== "string" || parsed.id.trim() === "") {
        throw new Error("Resend email send succeeded but did not return an id.");
      }

      return {
        id: parsed.id,
      };
    },
  };
}

async function defaultGetApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  const config = getRuntimeConfig();

  if (config.resendApiKey) {
    cachedApiKey = config.resendApiKey;
    return cachedApiKey;
  }

  if (!config.resendApiKeySecretArn) {
    throw new Error(
      "Resend API key is not configured. Set RESEND_API_KEY or RESEND_API_KEY_SECRET_ARN.",
    );
  }

  const secretString = (await getSecretString(config.resendApiKeySecretArn)).trim();

  if (!secretString) {
    throw new Error("Resend API key secret is empty.");
  }

  cachedApiKey = secretString;
  return cachedApiKey;
}
