import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSHandler,
} from "aws-lambda";

import { buildSendWelcomeEmail } from "../../emails/welcome/send-welcome-email";
import { createResendEmailProvider } from "../../providers/resend-client";
import { parseIdentityUserRegisteredEvent } from "../../shared/events/identity-user-registered";

interface IdentityUserRegisteredHandlerDependencies {
  sendWelcomeEmail: ReturnType<typeof buildSendWelcomeEmail>;
}

type IdentityUserRegisteredHandlerFunction = (
  event: SQSEvent,
) => Promise<SQSBatchResponse>;

export function buildIdentityUserRegisteredHandler({
  sendWelcomeEmail,
}: IdentityUserRegisteredHandlerDependencies): IdentityUserRegisteredHandlerFunction {
  return async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
    const batchItemFailures: SQSBatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const registration = parseIdentityUserRegisteredEvent(record.body, record.messageId);

        if (!registration.email) {
          console.info("Skipping welcome email because the event has no email address.", {
            messageId: record.messageId,
            eventId: registration.eventId,
            identityUserId: registration.identityUserId,
          });
          continue;
        }

        if (!registration.emailVerified) {
          console.info("Skipping welcome email because the email address is not verified.", {
            messageId: record.messageId,
            eventId: registration.eventId,
            identityUserId: registration.identityUserId,
            email: registration.email,
          });
          continue;
        }

        await sendWelcomeEmail({
          ...registration,
          email: registration.email,
        });
      } catch (error) {
        console.error("Failed to process identity registration email event.", {
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

const identityUserRegisteredHandler = buildIdentityUserRegisteredHandler({
  sendWelcomeEmail: buildSendWelcomeEmail({
    emailProvider: createResendEmailProvider(),
  }),
});

export const handler: SQSHandler = async (event) => identityUserRegisteredHandler(event);
