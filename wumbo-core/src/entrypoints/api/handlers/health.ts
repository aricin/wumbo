import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { pingDatabase } from "../../../adapters/db/client/connection";
import { getRuntimeConfig } from "../../../shared/config/runtime";
import { ok, serviceUnavailable } from "../../../shared/http/responses";

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = getRuntimeConfig();
  const shouldCheckDatabase = event.queryStringParameters?.check === "db";

  if (!shouldCheckDatabase) {
    return ok({
      service: config.serviceName,
      environment: config.environmentName,
      status: "ok",
    });
  }

  try {
    await pingDatabase();

    return ok({
      service: config.serviceName,
      environment: config.environmentName,
      status: "ok",
      database: "ok",
    });
  } catch (error) {
    console.error("Health check database probe failed.", error);

    return serviceUnavailable("Database connectivity check failed.");
  }
}
