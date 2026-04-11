import assert from "node:assert/strict";
import test from "node:test";

import { ValidationError } from "../errors/validation-error";
import { createCreatePropertyUseCase } from "../use-cases/create-property";
import {
  createEventOutboxFake,
  createPropertiesRepositoryFake,
  createUnitOfWorkFake,
  createUsersRepositoryFake,
  createWriteContextFake,
} from "./helpers/fakes";
import { createIdentityActor, createUser } from "./helpers/fixtures";

test("createProperty creates a property and enqueues a domain event", async () => {
  const createdInputs: Array<{ slug: string; title: string; description: string; ownerUserId: string }> = [];
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "owner-1", cognitoSubject: subject, email: "owner@example.com" });
        },
      }),
      properties: createPropertiesRepositoryFake({
        async create(input) {
          createdInputs.push({
            slug: input.slug,
            title: input.title,
            description: input.description,
            ownerUserId: input.ownerUserId,
          });

          return {
            id: input.id,
            ownerUserId: input.ownerUserId,
            slug: input.slug,
            title: input.title,
            description: input.description,
            visibility: input.visibility,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        },
      }),
      eventOutbox,
    }),
  );

  const createProperty = createCreatePropertyUseCase({ unitOfWork });
  const result = await createProperty({
    actor: createIdentityActor({ subject: "subject-123", email: "owner@example.com" }),
    slug: "my-property",
    title: "  My Property  ",
    description: "  A nice place.  ",
    visibility: "public",
  });

  assert.equal(createdInputs.length, 1);
  assert.deepEqual(createdInputs[0], {
    slug: "my-property",
    title: "My Property",
    description: "A nice place.",
    ownerUserId: "owner-1",
  });
  assert.equal(result.property.slug, "my-property");
  assert.equal(result.property.title, "My Property");
  assert.equal(eventOutbox.enqueuedEvents.length, 1);
  assert.equal(eventOutbox.enqueuedEvents[0]?.eventName, "property-created.v1");
  assert.equal(eventOutbox.enqueuedEvents[0]?.aggregateType, "property");
});

test("createProperty rejects invalid slugs before persisting", async () => {
  let createCalls = 0;
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "owner-1", cognitoSubject: subject });
        },
      }),
      properties: createPropertiesRepositoryFake({
        async create(input) {
          createCalls += 1;

          return {
            id: input.id,
            ownerUserId: input.ownerUserId,
            slug: input.slug,
            title: input.title,
            description: input.description,
            visibility: input.visibility,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        },
      }),
      eventOutbox,
    }),
  );

  const createProperty = createCreatePropertyUseCase({ unitOfWork });

  await assert.rejects(
    () =>
      createProperty({
        actor: createIdentityActor(),
        slug: "Not Valid",
        title: "Title",
        description: "Description",
        visibility: "public",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(
        error.message,
        "slug must be 3-80 characters of lowercase letters, numbers, or hyphens.",
      );
      return true;
    },
  );

  assert.equal(createCalls, 0);
  assert.equal(eventOutbox.enqueuedEvents.length, 0);
});
