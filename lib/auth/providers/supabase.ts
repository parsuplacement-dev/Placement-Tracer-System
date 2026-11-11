import "server-only";

import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/server";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { EXTERNAL_TIMEOUTS, withExternalTimeout } from "@/lib/server/timeouts";
import {
  ROLES,
  type CoordinatorScopeGrant,
  type CoordinatorScopeType,
  type Role,
} from "@/types";
import type { AuthProvider, AuthUser } from "../types";

interface AccountRow {
  id: string;
  provider_user_id: string | null;
  name: string;
  email: string;
  picture_url: string | null;
  role: Role;
  email_verified: boolean;
  enabled: boolean;
  role_change_notice: string | null;
  created_at: string;
  updated_at: string;
  coordinator_scope_grants?: CoordinatorGrantRow[];
}

interface CoordinatorGrantRow {
  id: string;
  scope_type: CoordinatorScopeType;
  campus: string;
  college: string | null;
  program: string | null;
}

class AccountDisabledError extends Error {}

function formatUser(row: AccountRow): AuthUser {
  if (!row.provider_user_id) {
    throw new Error("Authentication account is not linked to a provider user");
  }

  return {
    id: row.id,
    providerUserId: row.provider_user_id,
    name: row.name,
    email: row.email,
    pictureUrl: row.picture_url,
    role: row.role,
    coordinatorGrants: (row.coordinator_scope_grants ?? []).map(
      (grant): CoordinatorScopeGrant => ({
        id: grant.id,
        scopeType: grant.scope_type,
        campus: grant.campus,
        college: grant.college,
        program: grant.program,
      }),
    ),
    emailVerified: row.email_verified,
    enabled: row.enabled,
    roleChangeNotice: row.role_change_notice,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function googleProfile(user: User) {
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("A Google account email is required");
  }

  const provider = user.app_metadata.provider;
  if (provider !== "google") throw new Error("Google sign-in is required");

  const nameValue = user.user_metadata.full_name ?? user.user_metadata.name;
  const pictureValue =
    user.user_metadata.avatar_url ?? user.user_metadata.picture;

  return {
    email,
    name:
      typeof nameValue === "string" && nameValue.trim()
        ? nameValue.trim()
        : email.split("@")[0],
    pictureUrl: typeof pictureValue === "string" ? pictureValue : null,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

async function linkAccount(providerUser: User) {
  const profile = googleProfile(providerUser);
  const { data: linked, error: linkedError } = await supabase
    .from("auth_accounts")
    .select(
      "*, coordinator_scope_grants!coordinator_scope_grants_account_id_fkey(*)",
    )
    .eq("provider_user_id", providerUser.id)
    .maybeSingle<AccountRow>();

  if (linkedError) throw linkedError;

  if (linked) {
    if (
      linked.name === profile.name &&
      linked.picture_url === profile.pictureUrl &&
      linked.email_verified === profile.emailVerified
    ) {
      if (!linked.enabled)
        throw new AccountDisabledError("Account is disabled");
      return formatUser(linked);
    }

    const { data, error } = await supabase
      .from("auth_accounts")
      .update({
        name: profile.name,
        picture_url: profile.pictureUrl,
        email_verified: profile.emailVerified,
      })
      .eq("id", linked.id)
      .select(
        "*, coordinator_scope_grants!coordinator_scope_grants_account_id_fkey(*)",
      )
      .single<AccountRow>();
    if (error) throw error;
    if (!data.enabled) throw new AccountDisabledError("Account is disabled");
    return formatUser(data);
  }

  const { data: imported, error: importedError } = await supabase
    .from("auth_accounts")
    .select(
      "*, coordinator_scope_grants!coordinator_scope_grants_account_id_fkey(*)",
    )
    .eq("email", profile.email)
    .maybeSingle<AccountRow>();
  if (importedError) throw importedError;

  const id = imported?.id ?? providerUser.id;
  const role = imported?.role ?? ROLES.ALUMNI;
  const { data, error } = await supabase
    .from("auth_accounts")
    .upsert(
      {
        id,
        provider: "supabase",
        provider_user_id: providerUser.id,
        email: profile.email,
        name: profile.name,
        picture_url: profile.pictureUrl,
        email_verified: profile.emailVerified,
        enabled: imported?.enabled ?? true,
        role,
      },
      { onConflict: "id" },
    )
    .select(
      "*, coordinator_scope_grants!coordinator_scope_grants_account_id_fkey(*)",
    )
    .single<AccountRow>();

  if (error) throw error;
  if (!data.enabled) throw new AccountDisabledError("Account is disabled");
  return formatUser(data);
}

async function authenticatedProviderUser() {
  const client = await createSupabaseSessionClient();
  const { data, error } = await withExternalTimeout(
    client.auth.getUser(),
    EXTERNAL_TIMEOUTS.authentication,
  );

  if (error) {
    if (error.status === 401 || error.name === "AuthSessionMissingError") {
      return null;
    }
    throw error;
  }

  return data.user;
}

export const supabaseAuthProvider: AuthProvider = {
  async getCurrentUser() {
    const providerUser = await authenticatedProviderUser();
    if (!providerUser) return null;
    try {
      return await linkAccount(providerUser);
    } catch (error) {
      if (error instanceof AccountDisabledError) return null;
      throw error;
    }
  },

  async getGoogleAuthorizationUrl(origin) {
    const client = await createSupabaseSessionClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL("/api/auth/google/callback", origin).toString(),
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) throw error;
    return data.url;
  },

  async completeOAuth(code) {
    const client = await createSupabaseSessionClient();
    const { data, error } = await withExternalTimeout(
      client.auth.exchangeCodeForSession(code),
      EXTERNAL_TIMEOUTS.authentication,
    );
    if (error) throw error;

    try {
      return await linkAccount(data.user);
    } catch (error) {
      await client.auth.signOut().catch(() => undefined);
      throw error;
    }
  },

  async refreshSession() {
    const client = await createSupabaseSessionClient();
    const { error } = await withExternalTimeout(
      client.auth.refreshSession(),
      EXTERNAL_TIMEOUTS.authentication,
    );
    if (error) throw error;
  },

  async signOut() {
    const client = await createSupabaseSessionClient();
    const { error } = await client.auth.signOut();
    if (error && error.name !== "AuthSessionMissingError") throw error;
  },

  async consumeRoleChangeNotice(user) {
    if (!user.roleChangeNotice) return null;
    const { error } = await supabase
      .from("auth_accounts")
      .update({ role_change_notice: null })
      .eq("id", user.id);
    if (error) throw error;
    return user.roleChangeNotice;
  },
};
