import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSHandler,
} from "aws-lambda";

import { dbUnitOfWork } from "../../adapters/db/unit-of-work";
import { createRegisterUserFromIdentityUseCase } from "../../domain/use-cases/register-user-from-identity";

interface IdentityUserRegisteredHandlerDependencies {
  createRegisterUserFromIdentityUseCase: typeof createRegisterUserFromIdentityUseCase;
  unitOfWork: typeof dbUnitOfWork;
}

interface IdentityUserRegisteredEventDetail {
  data?: {
    identityUserId?: unknown;
    cognitoSubject?: unknown;
    email?: unknown;
  };
}

interface EventBridgeEnvelope {
  "detail-type"?: unknown;
  detail?: IdentityUserRegisteredEventDetail;
}

type IdentityUserRegisteredHandlerFunction = (
  event: SQSEvent,
) => Promise<SQSBatchResponse>;

export function buildIdentityUserRegisteredHandler({
  createRegisterUserFromIdentityUseCase,
  unitOfWork,
}: IdentityUserRegisteredHandlerDependencies): IdentityUserRegisteredHandlerFunction {
  return async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
    const registerUserFromIdentity = createRegisterUserFromIdentityUseCase({
      unitOfWork,
    });
    const batchItemFailures: SQSBatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const envelope = parseEnvelope(record.body);
        const input = parseIdentityUserRegisteredDetail(envelope.detail, record.messageId);

        await registerUserFromIdentity(input);
      } catch (error) {
        console.error("Failed to process identity registration event.", {
          messageId: record.messageId,
          error,
        });
        batchItemFailures.push({
          itemIdentifier: record.messageId,
        });
      }
    }

    return {
      batchItemFailures,
    };
  };
}

function parseEnvelope(body: string): EventBridgeEnvelope {
  const parsed = JSON.parse(body) as EventBridgeEnvelope;

  if (parsed["detail-type"] !== "identity.user.registered.v1") {
    throw new Error("Unexpected EventBridge detail-type for identity registration.");
  }

  return parsed;
}

function parseIdentityUserRegisteredDetail(
  detail: IdentityUserRegisteredEventDetail | undefined,
  messageId: string,
): {
  identityUserId: string;
  subject: string;
  email?: string;
} {
  const data = detail?.data;

  if (!data || typeof data !== "object") {
    throw new Error(`SQS message ${messageId} is missing identity registration data.`);
  }

  if (typeof data.identityUserId !== "string" || data.identityUserId.trim() === "") {
    throw new Error(`SQS message ${messageId} is missing data.identityUserId.`);
  }

  if (typeof data.cognitoSubject !== "string" || data.cognitoSubject.trim() === "") {
    throw new Error(`SQS message ${messageId} is missing data.cognitoSubject.`);
  }

  return {
    identityUserId: data.identityUserId,
    subject: data.cognitoSubject,
    email:
      typeof data.email === "string" && data.email.trim() !== "" ? data.email : undefined,
  };
}

const identityUserRegisteredHandler = buildIdentityUserRegisteredHandler({
  createRegisterUserFromIdentityUseCase,
  unitOfWork: dbUnitOfWork,
});

export const handler: SQSHandler = async (event) => identityUserRegisteredHandler(event);
