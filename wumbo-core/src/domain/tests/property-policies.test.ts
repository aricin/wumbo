import assert from "node:assert/strict";
import test from "node:test";

import {
  canCreateProperty,
  canReadProperty,
  canUpdateProperty,
} from "../policies/property-policies";
import { createDomainActor, createProperty } from "./helpers/fixtures";

test("property reads only allow public properties", () => {
  assert.equal(canReadProperty(createProperty({ visibility: "public" })), true);
  assert.equal(canReadProperty(createProperty({ visibility: "private" })), false);
});

test("authenticated actors can create properties", () => {
  const actor = createDomainActor({ userId: "owner-1" });

  assert.equal(canCreateProperty(actor), true);
});

test("property updates follow owner/admin rules", async (t) => {
  const property = createProperty({ ownerUserId: "owner-1" });
  const owner = createDomainActor({ userId: "owner-1", groups: [] });
  const admin = createDomainActor({ userId: "admin-1", groups: ["admin"] });
  const stranger = createDomainActor({ userId: "stranger-1", groups: [] });

  await t.test("owner can update their own property", () => {
    assert.equal(canUpdateProperty(owner, property), true);
  });

  await t.test("admin can update another user's property", () => {
    assert.equal(canUpdateProperty(admin, property), true);
  });

  await t.test("non-owner cannot update another user's property", () => {
    assert.equal(canUpdateProperty(stranger, property), false);
  });
});
