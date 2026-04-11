import { readBooleanEnv, readEnv, readIntegerEnv, readOptionalEnv } from "./env";

export interface RuntimeConfig {
  serviceName: string;
  environmentName: string;
  eventBusName?: string;
  publisherBatchSize: number;
  publisherClaimTimeoutSeconds: number;
  allowDevIdentityHeader: boolean;
}

let cachedRuntimeConfig: RuntimeConfig | undefined;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedRuntimeConfig) {
    return cachedRuntimeConfig;
  }

  const environmentName = readEnv("APP_ENV", "dev");

  cachedRuntimeConfig = {
    serviceName: readEnv("SERVICE_NAME", "wumbo-core"),
    environmentName,
    eventBusName: readOptionalEnv("EVENT_BUS_NAME"),
    publisherBatchSize: readIntegerEnv("PUBLISHER_BATCH_SIZE", 10),
    publisherClaimTimeoutSeconds: readIntegerEnv("PUBLISHER_CLAIM_TIMEOUT_SECONDS", 120),
    allowDevIdentityHeader:
      environmentName !== "prod" && readBooleanEnv("ALLOW_DEV_IDENTITY_HEADER", true),
  };

  return cachedRuntimeConfig;
}
