import assert from "node:assert/strict";
import test from "node:test";

import {
  canReadPrivateProfile,
  canReadPublicProfile,
  canUpdatePrivateProfile,
  canUpdatePublicProfile,
} from "../policies/profile-policies";
import { createDomainActor } from "./helpers/fixtures";

test("public profiles are always readable", () => {
  assert.equal(canReadPublicProfile(), true);
});

test("private profile access follows owner/admin rules", async (t) => {
  const owner = createDomainActor({ userId: "owner-1", groups: [] });
  const admin = createDomainActor({ userId: "admin-1", groups: ["admin"] });
  const stranger = createDomainActor({ userId: "stranger-1", groups: [] });

  await t.test("owner can read and update their own private profile", () => {
    assert.equal(canReadPrivateProfile(owner, "owner-1"), true);
    assert.equal(canUpdatePrivateProfile(owner, "owner-1"), true);
  });

  await t.test("admin can read and update another user's private profile", () => {
    assert.equal(canReadPrivateProfile(admin, "owner-1"), true);
    assert.equal(canUpdatePrivateProfile(admin, "owner-1"), true);
  });

  await t.test("non-owner cannot read or update another user's private profile", () => {
    assert.equal(canReadPrivateProfile(stranger, "owner-1"), false);
    assert.equal(canUpdatePrivateProfile(stranger, "owner-1"), false);
  });
});

test("public profile updates follow owner/admin rules", async (t) => {
  const owner = createDomainActor({ userId: "owner-1", groups: [] });
  const admin = createDomainActor({ userId: "admin-1", groups: ["admin"] });
  const stranger = createDomainActor({ userId: "stranger-1", groups: [] });

  await t.test("owner can update their own public profile", () => {
    assert.equal(canUpdatePublicProfile(owner, "owner-1"), true);
  });

  await t.test("admin can update another user's public profile", () => {
    assert.equal(canUpdatePublicProfile(admin, "owner-1"), true);
  });

  await t.test("non-owner cannot update another user's public profile", () => {
    assert.equal(canUpdatePublicProfile(stranger, "owner-1"), false);
  });
});
