import assert from "node:assert/strict";
import test from "node:test";

import { ValidationError } from "../errors/validation-error";
import { createUpdateMyPrivateProfileUseCase } from "../use-cases/update-my-private-profile";
import {
  createEventOutboxFake,
  createPrivateProfilesRepositoryFake,
  createUnitOfWorkFake,
  createUsersRepositoryFake,
  createWriteContextFake,
} from "./helpers/fakes";
import { createIdentityActor, createUser } from "./helpers/fixtures";

test("updateMyPrivateProfile normalizes optional fields and enqueues an event", async () => {
  const upsertInputs: Array<{
    userId: string;
    legalName?: string;
    phoneNumber?: string;
    contactEmail?: string;
    city?: string;
    stateRegion?: string;
    countryCode?: string;
  }> = [];
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "user-456", cognitoSubject: subject });
        },
      }),
      privateProfiles: createPrivateProfilesRepositoryFake({
        async upsertForUser(input) {
          upsertInputs.push(input);

          return {
            userId: input.userId,
            legalName: input.legalName,
            phoneNumber: input.phoneNumber,
            contactEmail: input.contactEmail,
            city: input.city,
            stateRegion: input.stateRegion,
            countryCode: input.countryCode,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        },
      }),
      eventOutbox,
    }),
  );

  const updateMyPrivateProfile = createUpdateMyPrivateProfileUseCase({ unitOfWork });
  const result = await updateMyPrivateProfile({
    actor: createIdentityActor(),
    legalName: "  Ada Lovelace  ",
    phoneNumber: " 555-1234 ",
    contactEmail: " ADA@EXAMPLE.COM ",
    city: "  London ",
    stateRegion: "  Greater London ",
    countryCode: " gb ",
  });

  assert.equal(upsertInputs.length, 1);
  assert.deepEqual(upsertInputs[0], {
    userId: "user-456",
    legalName: "Ada Lovelace",
    phoneNumber: "555-1234",
    contactEmail: "ada@example.com",
    city: "London",
    stateRegion: "Greater London",
    countryCode: "GB",
  });
  assert.equal(result.profile.countryCode, "GB");
  assert.equal(eventOutbox.enqueuedEvents.length, 1);
  assert.equal(eventOutbox.enqueuedEvents[0]?.eventName, "private-profile-updated.v1");
});

test("updateMyPrivateProfile rejects invalid contact emails", async () => {
  let upsertCalls = 0;
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "user-456", cognitoSubject: subject });
        },
      }),
      privateProfiles: createPrivateProfilesRepositoryFake({
        async upsertForUser(input) {
          upsertCalls += 1;
          return {
            userId: input.userId,
            legalName: input.legalName,
            phoneNumber: input.phoneNumber,
            contactEmail: input.contactEmail,
            city: input.city,
            stateRegion: input.stateRegion,
            countryCode: input.countryCode,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        },
      }),
      eventOutbox,
    }),
  );

  const updateMyPrivateProfile = createUpdateMyPrivateProfileUseCase({ unitOfWork });

  await assert.rejects(
    () =>
      updateMyPrivateProfile({
        actor: createIdentityActor(),
        contactEmail: "not-an-email",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.message, "contactEmail must be a valid email address.");
      return true;
    },
  );

  assert.equal(upsertCalls, 0);
  assert.equal(eventOutbox.enqueuedEvents.length, 0);
});

test("updateMyPrivateProfile rejects invalid country codes", async () => {
  let upsertCalls = 0;
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "user-456", cognitoSubject: subject });
        },
      }),
      privateProfiles: createPrivateProfilesRepositoryFake({
        async upsertForUser(input) {
          upsertCalls += 1;
          return {
            userId: input.userId,
            legalName: input.legalName,
            phoneNumber: input.phoneNumber,
            contactEmail: input.contactEmail,
            city: input.city,
            stateRegion: input.stateRegion,
            countryCode: input.countryCode,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        },
      }),
    }),
  );

  const updateMyPrivateProfile = createUpdateMyPrivateProfileUseCase({ unitOfWork });

  await assert.rejects(
    () =>
      updateMyPrivateProfile({
        actor: createIdentityActor(),
        countryCode: "gbr",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.message, "countryCode must be a two-letter country code.");
      return true;
    },
  );

  assert.equal(upsertCalls, 0);
});
