import { readEnv, readOptionalEnv } from "./env";

export interface RuntimeConfig {
  serviceName: string;
  environmentName: string;
  publicBaseUrl?: string;
  defaultFromEmail: string;
  defaultReplyToEmail?: string;
  resendApiKey?: string;
  resendApiKeySecretArn?: string;
  resendWebhookSecret?: string;
  resendWebhookSecretArn?: string;
}

let cachedRuntimeConfig: RuntimeConfig | undefined;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedRuntimeConfig) {
    return cachedRuntimeConfig;
  }

  cachedRuntimeConfig = {
    serviceName: readEnv("SERVICE_NAME", "wumbo-email"),
    environmentName: readEnv("APP_ENV", "dev"),
    publicBaseUrl: readOptionalEnv("PUBLIC_BASE_URL"),
    defaultFromEmail: readEnv("DEFAULT_FROM_EMAIL"),
    defaultReplyToEmail: readOptionalEnv("DEFAULT_REPLY_TO_EMAIL"),
    resendApiKey: readOptionalEnv("RESEND_API_KEY"),
    resendApiKeySecretArn: readOptionalEnv("RESEND_API_KEY_SECRET_ARN"),
    resendWebhookSecret: readOptionalEnv("RESEND_WEBHOOK_SECRET"),
    resendWebhookSecretArn: readOptionalEnv("RESEND_WEBHOOK_SECRET_ARN"),
  };

  return cachedRuntimeConfig;
}

export function resetRuntimeConfigForTests(): void {
  cachedRuntimeConfig = undefined;
}
