import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSignupName,
  isParsuAccount,
  needsSignupName,
  signupNameSchema,
} from "./signup-name.ts";

test("sign-up normalizes whitespace and preserves capitalization in display order", () => {
  const name = signupNameSchema.parse({
    lastName: "  de   la Cruz ",
    firstName: " Ana  Maria ",
    middleName: "  Reyes ",
    extensionName: " Jr. ",
  });
  assert.equal(formatSignupName(name), "Ana Maria Reyes de la Cruz Jr.");
  assert.equal(
    formatSignupName(
      signupNameSchema.parse({ ...name, middleName: "", extensionName: "" }),
    ),
    "Ana Maria de la Cruz",
  );
});

test("first and last names must contain text", () => {
  const name = {
    firstName: "Ana",
    lastName: "Cruz",
    middleName: "",
    extensionName: "",
  };
  assert.equal(
    signupNameSchema.safeParse({ ...name, firstName: "  " }).success,
    false,
  );
  assert.equal(
    signupNameSchema.safeParse({ ...name, lastName: "\t" }).success,
    false,
  );
  assert.equal(
    signupNameSchema.safeParse({ ...name, extensionName: "x".repeat(31) })
      .success,
    false,
  );
});

test("only unconfirmed non-ParSU accounts need the name form", () => {
  assert.equal(
    needsSignupName({ email: "alumni@gmail.com", nameConfirmedAt: null }),
    true,
  );
  assert.equal(
    needsSignupName({
      email: "alumni@gmail.com",
      nameConfirmedAt: "2026-11-11",
    }),
    false,
  );
  assert.equal(
    needsSignupName({ email: "ALUMNI@PARSU.EDU.PH", nameConfirmedAt: null }),
    false,
  );
  assert.equal(isParsuAccount("alumni@fakeparsu.edu.ph"), false);
  assert.equal(isParsuAccount("alumni@parsu.edu.ph.example.com"), false);
});
