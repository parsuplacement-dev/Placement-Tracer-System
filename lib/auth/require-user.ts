import { redirect } from "next/navigation";
import { cache } from "react";

import { getCurrentUser } from "./current-user";
import { requireRole } from "./roles";
import { Role, ROLES } from "@/types";
import { needsSignupName } from "./signup-name";

export const requireUser = cache(async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/api/auth/session-expired");
  }

  if (needsSignupName(user)) redirect("/signup");

  return { user };
});

export async function requireUserRole(allowed: Role[]) {
  const { user } = await requireUser();

  try {
    requireRole(user, allowed);
  } catch {
    redirect("/unauthorized");
  }

  return user;
}

export async function requireAdmin() {
  const { user } = await requireUser();

  try {
    requireRole(user, [ROLES.ADMIN]);
  } catch {
    redirect("/unauthorized");
  }

  return user;
}

export async function requireStaff() {
  return requireUserRole([ROLES.ADMIN, ROLES.COORDINATOR]);
}
