import type { Role } from "../../types/roles.ts";

export const ACCOUNT_SORT_COLUMNS = {
  name: "name",
  email: "email",
  role: "role",
  verified: "email_verified",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

export class InvalidAccountQueryError extends Error {}

export function parseAccountQuery(params: URLSearchParams) {
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "10");
  const search = params.get("search")?.trim() ?? "";
  const role = params.get("role")?.trim() || undefined;
  const sort = params.get("sort") ?? "createdAt";
  const direction = params.get("direction") ?? "desc";

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(page * limit)
  ) {
    throw new InvalidAccountQueryError("Page must be a positive integer.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new InvalidAccountQueryError("Limit must be between 1 and 100.");
  }
  if (search.length > 100) {
    throw new InvalidAccountQueryError(
      "Search must not exceed 100 characters.",
    );
  }
  if (role && !["admin", "coordinator", "alumni"].includes(role)) {
    throw new InvalidAccountQueryError("Invalid role filter.");
  }
  if (!Object.hasOwn(ACCOUNT_SORT_COLUMNS, sort)) {
    throw new InvalidAccountQueryError("Invalid sort field.");
  }
  if (direction !== "asc" && direction !== "desc") {
    throw new InvalidAccountQueryError("Invalid sort direction.");
  }
  return {
    page,
    limit,
    search,
    role: role as Role | undefined,
    sort: sort as keyof typeof ACCOUNT_SORT_COLUMNS,
    direction,
  };
}
