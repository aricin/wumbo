import { withTransaction } from "../db/connection";
import {
  createUsersRepository,
  type UpsertUserFromCognitoResult,
} from "../db/repositories/users-repository";
import { createOutboxRepository } from "../db/repositories/outbox-repository";
import type { DomainEvent } from "../shared/domain-event";
import { createIdentityUserRegisteredEvent } from "./identity-user-registered-event";

export interface RegisterConfirmedUserInput {
  subject: string;
  email?: string;
  emailVerified: boolean;
}

type UsersWriter = Pick<ReturnType<typeof createUsersRepository>, "upsertFromCognito">;
type OutboxWriter = {
  enqueue(event: DomainEvent): Promise<void>;
};

interface RegisterConfirmedUserContext {
  users: UsersWriter;
  outbox: OutboxWriter;
}

type RegisterConfirmedUserRunner = <T>(
  work: (context: RegisterConfirmedUserContext) => Promise<T>,
) => Promise<T>;

interface RegisterConfirmedUserDependencies {
  runInTransaction?: RegisterConfirmedUserRunner;
}

export function buildRegisterConfirmedUser({
  runInTransaction = runRegisterConfirmedUserInTransaction,
}: RegisterConfirmedUserDependencies = {}) {
  return async function registerConfirmedUser(
    input: RegisterConfirmedUserInput,
  ): Promise<UpsertUserFromCognitoResult> {
    const subject = normalizeSubject(input.subject);
    const email = normalizeOptionalEmail(input.email);

    return runInTransaction(async ({ users, outbox }) => {
      const result = await users.upsertFromCognito({
        subject,
        email,
        emailVerified: input.emailVerified,
      });

      if (result.created) {
        await outbox.enqueue(
          createIdentityUserRegisteredEvent({
            identityUserId: result.user.id,
            cognitoSubject: result.user.cognitoSubject,
            email: result.user.email,
            emailVerified: result.user.emailVerified,
          }),
        );
      }

      return result;
    });
  };
}

export const registerConfirmedUser = buildRegisterConfirmedUser();

async function runRegisterConfirmedUserInTransaction<T>(
  work: (context: RegisterConfirmedUserContext) => Promise<T>,
): Promise<T> {
  return withTransaction(async (db) =>
    work({
      users: createUsersRepository(db),
      outbox: createOutboxRepository(db),
    }),
  );
}

function normalizeSubject(subject: string): string {
  const trimmed = subject.trim();

  if (trimmed.length < 1) {
    throw new Error("subject is required.");
  }

  return trimmed;
}

function normalizeOptionalEmail(email: string | undefined): string | undefined {
  if (!email) {
    return undefined;
  }

  const trimmed = email.trim().toLowerCase();

  return trimmed === "" ? undefined : trimmed;
}
