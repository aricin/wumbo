import { readEnv, readIntegerEnv, readOptionalEnv } from "./env";

export interface RuntimeConfig {
  serviceName: string;
  environmentName: string;
  eventBusName?: string;
  publisherBatchSize: number;
  publisherClaimTimeoutSeconds: number;
}

let cachedRuntimeConfig: RuntimeConfig | undefined;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedRuntimeConfig) {
    return cachedRuntimeConfig;
  }

  cachedRuntimeConfig = {
    serviceName: readEnv("SERVICE_NAME", "wumbo-identity"),
    environmentName: readEnv("APP_ENV", "dev"),
    eventBusName: readOptionalEnv("EVENT_BUS_NAME"),
    publisherBatchSize: readIntegerEnv("PUBLISHER_BATCH_SIZE", 10),
    publisherClaimTimeoutSeconds: readIntegerEnv("PUBLISHER_CLAIM_TIMEOUT_SECONDS", 120),
  };

  return cachedRuntimeConfig;
}
