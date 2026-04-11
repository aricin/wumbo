import assert from "node:assert/strict";
import test from "node:test";

import { ForbiddenError } from "../errors/forbidden-error";
import { NotFoundError } from "../errors/not-found-error";
import { ValidationError } from "../errors/validation-error";
import { createUpdatePropertyUseCase } from "../use-cases/update-property";
import {
  createEventOutboxFake,
  createPropertiesRepositoryFake,
  createUnitOfWorkFake,
  createUsersRepositoryFake,
  createWriteContextFake,
} from "./helpers/fakes";
import { createIdentityActor, createProperty, createUser } from "./helpers/fixtures";

test("updateProperty allows an owner to update a property and enqueues an event", async () => {
  const updateInputs: Array<{
    id: string;
    slug?: string;
    title?: string;
    description?: string;
    visibility?: "public" | "private";
  }> = [];
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "owner-1", cognitoSubject: subject });
        },
      }),
      properties: createPropertiesRepositoryFake({
        async findById(id) {
          return createProperty({ id, ownerUserId: "owner-1", slug: "old-slug" });
        },
        async update(input) {
          updateInputs.push(input);

          return createProperty({
            id: input.id,
            ownerUserId: "owner-1",
            slug: input.slug ?? "old-slug",
            title: input.title ?? "Old Title",
            description: input.description ?? "Old Description",
            visibility: input.visibility ?? "public",
          });
        },
      }),
      eventOutbox,
    }),
  );

  const updateProperty = createUpdatePropertyUseCase({ unitOfWork });
  const result = await updateProperty({
    actor: createIdentityActor({ subject: "owner-subject" }),
    propertyId: "property-1",
    slug: "  updated-slug  ",
    title: "  Updated Title  ",
    description: "  Updated Description  ",
    visibility: "private",
  });

  assert.equal(updateInputs.length, 1);
  assert.deepEqual(updateInputs[0], {
    id: "property-1",
    slug: "updated-slug",
    title: "Updated Title",
    description: "Updated Description",
    visibility: "private",
  });
  assert.equal(result.property.slug, "updated-slug");
  assert.equal(eventOutbox.enqueuedEvents.length, 1);
  assert.equal(eventOutbox.enqueuedEvents[0]?.eventName, "property-updated.v1");
});

test("updateProperty throws when the property does not exist", async () => {
  let updateCalls = 0;
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "owner-1", cognitoSubject: subject });
        },
      }),
      properties: createPropertiesRepositoryFake({
        async findById() {
          return null;
        },
        async update(input) {
          updateCalls += 1;
          return createProperty({
            id: input.id,
          });
        },
      }),
    }),
  );

  const updateProperty = createUpdatePropertyUseCase({ unitOfWork });

  await assert.rejects(
    () =>
      updateProperty({
        actor: createIdentityActor(),
        propertyId: "missing-property",
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundError);
      assert.equal(error.message, "Property not found.");
      return true;
    },
  );

  assert.equal(updateCalls, 0);
});

test("updateProperty rejects non-owner non-admin actors", async () => {
  let updateCalls = 0;
  const eventOutbox = createEventOutboxFake();
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "stranger-1", cognitoSubject: subject });
        },
      }),
      properties: createPropertiesRepositoryFake({
        async findById(id) {
          return createProperty({ id, ownerUserId: "owner-1" });
        },
        async update(input) {
          updateCalls += 1;
          return createProperty({
            id: input.id,
          });
        },
      }),
      eventOutbox,
    }),
  );

  const updateProperty = createUpdatePropertyUseCase({ unitOfWork });

  await assert.rejects(
    () =>
      updateProperty({
        actor: createIdentityActor({ subject: "stranger-subject", groups: [] }),
        propertyId: "property-1",
        title: "Should Not Work",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenError);
      assert.equal(error.message, "You do not have permission to update this property.");
      return true;
    },
  );

  assert.equal(updateCalls, 0);
  assert.equal(eventOutbox.enqueuedEvents.length, 0);
});

test("updateProperty rejects invalid slugs before persisting the update", async () => {
  let updateCalls = 0;
  const unitOfWork = createUnitOfWorkFake(
    createWriteContextFake({
      users: createUsersRepositoryFake({
        async findByCognitoSubject(subject) {
          return createUser({ id: "owner-1", cognitoSubject: subject });
        },
      }),
      properties: createPropertiesRepositoryFake({
        async findById(id) {
          return createProperty({ id, ownerUserId: "owner-1", slug: "existing-slug" });
        },
        async update(input) {
          updateCalls += 1;
          return createProperty({
            id: input.id,
          });
        },
      }),
    }),
  );

  const updateProperty = createUpdatePropertyUseCase({ unitOfWork });

  await assert.rejects(
    () =>
      updateProperty({
        actor: createIdentityActor({ subject: "owner-subject" }),
        propertyId: "property-1",
        slug: "Invalid Slug",
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

  assert.equal(updateCalls, 0);
});
