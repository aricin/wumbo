import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { eq } from "drizzle-orm";

import { getDb } from "../client/connection";
import { dbUnitOfWork } from "../unit-of-work";
import { outboxEvents, properties, users } from "../schema";
import {
  cleanupCommittedRecords,
  closeTestDatabase,
  configureDbTestEnv,
  createTestKey,
  ensureTestDatabase,
  hasTestDatabaseConfig,
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

dbTest("dbUnitOfWork commits all writes when the work succeeds", async () => {
  const subject = createTestKey("uow-subject");
  const slug = createTestKey("uow-property");
  let createdUserId = "";
  let propertyId = "";

  try {
    await dbUnitOfWork.run(async (context) => {
      const user = await context.users.upsertFromIdentity({
        identityUserId: createTestKey("identity-user"),
        subject,
        email: "uow@example.com",
      });
      createdUserId = user.user.id;
      propertyId = createTestKey("uow-property-id");

      await context.properties.create({
        id: propertyId,
        ownerUserId: user.user.id,
        slug,
        title: "Committed Property",
        description: "Committed description",
        visibility: "public",
      });

      await context.eventOutbox.enqueue({
        id: createTestKey("uow-event"),
      eventName: "property-created.v1",
        aggregateType: "property",
        aggregateId: propertyId,
        occurredAt: new Date().toISOString(),
        payload: {
          propertyId,
        },
      });
    });

    const db = await getDb();
    const persistedUser = await db.query.users.findFirst({
      where: eq(users.cognitoSubject, subject),
    });
    const persistedProperty = await db.query.properties.findFirst({
      where: eq(properties.id, propertyId),
    });
    const persistedOutboxEvent = await db.query.outboxEvents.findFirst({
      where: eq(outboxEvents.aggregateId, propertyId),
    });

    assert.ok(persistedUser);
    assert.ok(persistedProperty);
    assert.ok(persistedOutboxEvent);
    assert.equal(persistedProperty.slug, slug);
  assert.equal(persistedOutboxEvent.eventName, "property-created.v1");
  } finally {
    await cleanupCommittedRecords({
      propertyId,
      userId: createdUserId || undefined,
      outboxAggregateId: propertyId || undefined,
    outboxEventName: "property-created.v1",
    });
  }
});

dbTest("dbUnitOfWork rolls back all writes when the work throws", async () => {
  const subject = createTestKey("rollback-subject");
  const slug = createTestKey("rollback-property");
  const propertyId = createTestKey("rollback-property-id");

  await assert.rejects(
    () =>
      dbUnitOfWork.run(async (context) => {
        const user = await context.users.upsertFromIdentity({
          identityUserId: createTestKey("identity-user"),
          subject,
          email: "rollback@example.com",
        });

        await context.properties.create({
          id: propertyId,
          ownerUserId: user.user.id,
          slug,
          title: "Rolled Back Property",
          description: "Rollback description",
          visibility: "public",
        });

        throw new Error("boom");
      }),
    /boom/,
  );

  const db = await getDb();
  const persistedUser = await db.query.users.findFirst({
    where: eq(users.cognitoSubject, subject),
  });
  const persistedProperty = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
  });

  assert.equal(persistedUser, null);
  assert.equal(persistedProperty, null);
});
