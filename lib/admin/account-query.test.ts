import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidAccountQueryError,
  parseAccountQuery,
} from "./account-query.ts";

test("account list defaults to a bounded page", () => {
  assert.deepEqual(parseAccountQuery(new URLSearchParams()), {
    page: 1,
    limit: 10,
    search: "",
    role: undefined,
    sort: "createdAt",
    direction: "desc",
  });
});

test("account list accepts server filters and sort options", () => {
  assert.deepEqual(
    parseAccountQuery(
      new URLSearchParams({
        page: "3",
        limit: "25",
        search: "  Romero  ",
        role: "coordinator",
        sort: "verified",
        direction: "asc",
      }),
    ),
    {
      page: 3,
      limit: 25,
      search: "Romero",
      role: "coordinator",
      sort: "verified",
      direction: "asc",
    },
  );
});

test("account queries reject unbounded pagination and unsafe offsets", () => {
  for (const query of [
    "page=0",
    "page=-1",
    "page=1.5",
    "page=Infinity",
    "limit=0",
    "limit=101",
    "limit=NaN",
    "page=9007199254740991&limit=100",
  ]) {
    assert.throws(
      () => parseAccountQuery(new URLSearchParams(query)),
      InvalidAccountQueryError,
    );
  }
});

test("account queries reject unknown fields, roles, directions and oversized searches", () => {
  for (const query of [
    "sort=__proto__",
    "sort=constructor",
    "sort=account_search_text",
    "role=superadmin",
    "direction=random",
    `search=${"a".repeat(101)}`,
  ]) {
    assert.throws(
      () => parseAccountQuery(new URLSearchParams(query)),
      InvalidAccountQueryError,
    );
  }
});

test("search punctuation stays a single search value", () => {
  const search = 'name%,role.eq.admin_(test)\\"';
  assert.equal(
    parseAccountQuery(new URLSearchParams({ search })).search,
    search,
  );
});
