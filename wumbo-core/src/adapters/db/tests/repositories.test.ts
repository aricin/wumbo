import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createEventOutbox } from "../repositories/event-outbox";
import { createPropertiesRepository } from "../repositories/properties-repository";
import { createPublicProfilesRepository } from "../repositories/public-profiles-repository";
import { createUsersRepository } from "../repositories/users-repository";
import { ConflictError } from "../../../domain/errors/conflict-error";
import {
  cleanupCommittedRecords,
  closeTestDatabase,
  configureDbTestEnv,
  createTestKey,
  ensureTestDatabase,
  hasTestDatabaseConfig,
  withRollbackTransaction,
} from "./helpers/test-database";

const dbTest = hasTestDatabaseConfig() ? test : test.skip;

before(async () => {
  if (!hasTestDatabaseConfig()) {
    return;
  }

  configureDbTestEnv();
  await ensureTestDatabase();
});

after(async () => {
  if (!hasTestDatabaseConfig()) {
    return;
  }

  await closeTestDatabase();
});

dbTest("UsersRepository creates and then updates the same user by Cognito subject", async () => {
  await withRollbackTransaction(async (db) => {
    const usersRepository = createUsersRepository(db);
    const subject = createTestKey("subject");
    const identityUserId = createTestKey("identity-user");

    const created = await usersRepository.upsertFromIdentity({
      identityUserId,
      subject,
      email: "first@example.com",
    });

    const updated = await usersRepository.upsertFromIdentity({
      identityUserId,
      subject,
      email: "second@example.com",
    });

    assert.equal(created.created, true);
    assert.equal(created.user.identityUserId, identityUserId);
    assert.equal(created.user.cognitoSubject, subject);
    assert.equal(updated.created, false);
    assert.equal(updated.emailUpdated, true);
    assert.equal(updated.user.id, created.user.id);
    assert.equal(updated.user.email, "second@example.com");

    const found = await usersRepository.findByCognitoSubject(subject);

    assert.ok(found);
    assert.equal(found.id, created.user.id);
    assert.equal(found.email, "second@example.com");
  });
});

dbTest("PublicProfilesRepository upserts and reads a public profile", async () => {
  await withRollbackTransaction(async (db) => {
    const usersRepository = createUsersRepository(db);
    const publicProfilesRepository = createPublicProfilesRepository(db);
    const subject = createTestKey("subject");
    const handle = createTestKey("handle").replace(/-/g, "_");
    const user = await usersRepository.upsertFromIdentity({
      identityUserId: createTestKey("identity-user"),
      subject,
      email: "profile@example.com",
    });

    const created = await publicProfilesRepository.upsertForUser({
      userId: user.user.id,
      handle,
      displayName: "Original Display Name",
      bio: "Original bio",
    });

    const updated = await publicProfilesRepository.upsertForUser({
      userId: user.user.id,
      handle,
      displayName: "Updated Display Name",
      bio: "Updated bio",
      avatarUrl: "https://example.com/avatar.png",
    });

    const found = await publicProfilesRepository.findByHandle(handle);

    assert.equal(created.userId, user.user.id);
    assert.equal(updated.displayName, "Updated Display Name");
    assert.equal(updated.avatarUrl, "https://example.com/avatar.png");
    assert.ok(found);
    assert.equal(found.userId, user.user.id);
    assert.equal(found.bio, "Updated bio");
  });
});

dbTest("PropertiesRepository creates, updates, and translates unique slug conflicts", async () => {
  await withRollbackTransaction(async (db) => {
    const usersRepository = createUsersRepository(db);
    const propertiesRepository = createPropertiesRepository(db);
    const owner = await usersRepository.upsertFromIdentity({
      identityUserId: createTestKey("identity-user"),
      subject: createTestKey("subject"),
      email: "owner@example.com",
    });
    const duplicateOwner = await usersRepository.upsertFromIdentity({
      identityUserId: createTestKey("identity-user"),
      subject: createTestKey("subject"),
      email: "other-owner@example.com",
    });
    const slug = createTestKey("property");

    const created = await propertiesRepository.create({
      id: createTestKey("property-id"),
      ownerUserId: owner.user.id,
      slug,
      title: "Created title",
      description: "Created description",
      visibility: "public",
    });

    const updated = await propertiesRepository.update({
      id: created.id,
      title: "Updated title",
      description: "Updated description",
      visibility: "private",
    });

    const publicResult = await propertiesRepository.findPublicBySlug(slug);

    assert.equal(updated.title, "Updated title");
    assert.equal(updated.visibility, "private");
    assert.equal(publicResult, null);

    await assert.rejects(
      () =>
        propertiesRepository.create({
          id: createTestKey("property-id"),
          ownerUserId: duplicateOwner.user.id,
          slug,
          title: "Duplicate slug",
          description: "Description",
          visibility: "public",
        }),
      (error: unknown) => {
        assert.ok(error instanceof ConflictError);
        assert.equal(error.message, "slug is already in use.");
        return true;
      },
    );
  });
});

dbTest("EventOutbox claims pending events, skips active claims, and reclaims stale work", async () => {
  await withRollbackTransaction(async (db) => {
    const eventOutbox = createEventOutbox(db);
    const firstAggregateId = createTestKey("aggregate");
    const secondAggregateId = createTestKey("aggregate");
    const firstEventId = createTestKey("event");
    const secondEventId = createTestKey("event");

    await eventOutbox.enqueue({
      id: firstEventId,
        eventName: "test-event.v1",
      aggregateType: "property",
      aggregateId: firstAggregateId,
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: {
        aggregateId: firstAggregateId,
      },
    });
    await eventOutbox.enqueue({
      id: secondEventId,
        eventName: "test-event.v1",
      aggregateType: "property",
      aggregateId: secondAggregateId,
      occurredAt: "2026-01-01T00:01:00.000Z",
      payload: {
        aggregateId: secondAggregateId,
      },
    });

    const firstClaim = await eventOutbox.claimPending({
      limit: 1,
      claimToken: "claim-1",
      claimedAt: "2026-01-01T00:02:00.000Z",
      staleBefore: "2026-01-01T00:00:30.000Z",
    });

    assert.equal(firstClaim.length, 1);
    assert.equal(firstClaim[0]?.id, firstEventId);
    assert.equal(firstClaim[0]?.publishAttempts, 0);

    const secondClaim = await eventOutbox.claimPending({
      limit: 10,
      claimToken: "claim-2",
      claimedAt: "2026-01-01T00:02:10.000Z",
      staleBefore: "2026-01-01T00:01:30.000Z",
    });

    assert.equal(secondClaim.length, 1);
    assert.equal(secondClaim[0]?.id, secondEventId);

    const reclaimed = await eventOutbox.claimPending({
      limit: 10,
      claimToken: "claim-3",
      claimedAt: "2026-01-01T00:05:00.000Z",
      staleBefore: "2026-01-01T00:04:00.000Z",
    });

    assert.equal(reclaimed.length, 2);
    assert.deepEqual(
      reclaimed.map((event) => event.id),
      [firstEventId, secondEventId],
    );

    await eventOutbox.markPublished(firstEventId, "claim-3", 1);
    await eventOutbox.markFailed(secondEventId, "claim-3", 1, "boom");

    const afterFinalize = await eventOutbox.claimPending({
      limit: 10,
      claimToken: "claim-4",
      claimedAt: "2026-01-01T00:06:00.000Z",
      staleBefore: "2026-01-01T00:05:00.000Z",
    });

    assert.equal(afterFinalize.length, 1);
    assert.equal(afterFinalize[0]?.id, secondEventId);
    assert.equal(afterFinalize[0]?.publishAttempts, 1);
    assert.equal(afterFinalize[0]?.lastError, "boom");
  });
});

dbTest("cleanup helper removes committed rows created by DB tests", async () => {
  const db = await ensureTestDatabase();
  const usersRepository = createUsersRepository(db);
  const propertiesRepository = createPropertiesRepository(db);
  const subject = createTestKey("cleanup-subject");
  const slug = createTestKey("cleanup-property");
  const propertyId = createTestKey("cleanup-property-id");
  const user = await usersRepository.upsertFromIdentity({
    identityUserId: createTestKey("identity-user"),
    subject,
    email: "cleanup@example.com",
  });

  await propertiesRepository.create({
    id: propertyId,
    ownerUserId: user.user.id,
    slug,
    title: "Cleanup Property",
    description: "Cleanup description",
    visibility: "public",
  });

  await cleanupCommittedRecords({
    propertyId,
    userId: user.user.id,
  });

  const foundUser = await usersRepository.findByCognitoSubject(subject);
  const foundProperty = await propertiesRepository.findById(propertyId);

  assert.equal(foundUser, null);
  assert.equal(foundProperty, null);
});
