import assert from "node:assert/strict";
import test from "node:test";

import { NotFoundError } from "../errors/not-found-error";
import { createGetPropertyUseCase } from "../use-cases/get-property";
import { createPropertiesRepositoryFake } from "./helpers/fakes";
import { createProperty } from "./helpers/fixtures";

test("getProperty returns a public property by slug", async () => {
  const property = createProperty({ slug: "wumbo-property", visibility: "public" });
  const getProperty = createGetPropertyUseCase({
    properties: createPropertiesRepositoryFake({
      async findBySlug(slug) {
        return slug === "wumbo-property" ? property : null;
      },
    }),
  });

  const result = await getProperty({
    slug: "wumbo-property",
  });

  assert.equal(result.property, property);
});

test("getProperty hides private properties from public reads", async () => {
  const getProperty = createGetPropertyUseCase({
    properties: createPropertiesRepositoryFake({
      async findBySlug() {
        return createProperty({ visibility: "private" });
      },
    }),
  });

  await assert.rejects(
    () =>
      getProperty({
        slug: "private-property",
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundError);
      assert.equal(error.message, "Property not found.");
      return true;
    },
  );
});

test("getProperty throws when the property does not exist", async () => {
  const getProperty = createGetPropertyUseCase({
    properties: createPropertiesRepositoryFake({
      async findBySlug() {
        return null;
      },
    }),
  });

  await assert.rejects(
    () =>
      getProperty({
        slug: "missing-property",
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundError);
      assert.equal(error.message, "Property not found.");
      return true;
    },
  );
});
