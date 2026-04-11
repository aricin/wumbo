import type { ScheduledEvent } from "aws-lambda";

import { publishPendingOutboxBatch } from "../../adapters/eventbridge/domain-event-publisher";

export async function handler(_event: ScheduledEvent): Promise<unknown> {
  const result = await publishPendingOutboxBatch();

  console.log("Outbox publish run complete.", result);

  return result;
}
