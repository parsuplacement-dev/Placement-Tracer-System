import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessProgram,
  canManageManualResponse,
  canManageResponse,
  getAllowedProgramValues,
  getRole,
  isAdmin,
  isCoordinator,
  requireRole,
} from "./roles.ts";
import type { AuthUser } from "./types.ts";

function user(role: AuthUser["role"]): AuthUser {
  return {
    id: "canonical-id",
    providerUserId: "provider-id",
    name: "Test User",
    nameConfirmedAt: "2026-01-01T00:00:00.000Z",
    email: "test@parsu.edu.ph",
    pictureUrl: null,
    role,
    coordinatorGrants: [],
    emailVerified: true,
    enabled: true,
    roleChangeNotice: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("role checks operate on the provider-neutral auth user", () => {
  const admin = user("admin");
  const alumni = user("alumni");

  assert.equal(getRole(admin), "admin");
  assert.equal(isAdmin(admin), true);
  assert.equal(isAdmin(alumni), false);
  assert.equal(requireRole(alumni, ["alumni"]), "alumni");
  assert.throws(() => requireRole(alumni, ["admin"]), /Forbidden/);
});

test("coordinator access is the union of campus, college, and program grants", () => {
  const coordinator = user("coordinator");
  coordinator.coordinatorGrants = [
    {
      scopeType: "campus",
      campus: "Goa Campus",
      college: null,
      program: null,
    },
    {
      scopeType: "program",
      campus: "Lagonoy Campus",
      college: "College of Criminal Justice Education",
      program: "bscrim",
    },
  ];

  const programs = getAllowedProgramValues(coordinator)!;
  assert.equal(isCoordinator(coordinator), true);
  assert.equal(programs.includes("bsit"), true);
  assert.equal(programs.includes("bscrim"), true);
  assert.equal(programs.includes("bsfish"), false);
  assert.equal(canAccessProgram(coordinator, "bscrim"), true);
  assert.equal(canAccessProgram(coordinator, "bsfish"), false);
});

test("coordinators can resume only their own unassigned manual drafts", () => {
  const coordinator = user("coordinator");
  const draft = {
    userId: null,
    enteredByUserId: coordinator.id,
    source: "admin_import",
    status: "draft",
    answers: {},
  };

  assert.equal(canManageResponse(coordinator, draft), true);
  assert.equal(
    canManageResponse({ ...coordinator, id: "another-account" }, draft),
    false,
  );
  assert.equal(
    canManageResponse(coordinator, { ...draft, status: "submitted" }),
    false,
  );
  assert.equal(
    canManageResponse(coordinator, {
      ...draft,
      answers: { program: "bsfish" },
    }),
    false,
  );
  assert.equal(canManageManualResponse(coordinator, draft), true);
  assert.equal(
    canManageManualResponse(coordinator, { ...draft, source: "alumni" }),
    false,
  );
});

test("invalid stored coordinator grants fail closed", () => {
  const coordinator = user("coordinator");
  coordinator.coordinatorGrants = [
    {
      scopeType: "program",
      campus: "Goa Campus",
      college: "College of Education",
      program: "bsfish",
    },
  ];

  assert.deepEqual(getAllowedProgramValues(coordinator), []);
  assert.equal(canAccessProgram(coordinator, "bsfish"), false);
});
