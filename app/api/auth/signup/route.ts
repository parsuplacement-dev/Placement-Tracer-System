import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatSignupName,
  needsSignupName,
  signupNameSchema,
} from "@/lib/auth/signup-name";
import { supabase } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/responses";
import { ROLES } from "@/types";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Authentication is required.", 401);
    if (!needsSignupName(user))
      return fail("Your account does not require sign-up.", 409);

    const body = await request.json().catch(() => null);
    const parsed = signupNameSchema.safeParse(body);
    if (!parsed.success) return fail("Please check your name fields.", 400);
    const name = formatSignupName(parsed.data);
    if (body.confirmedName !== name)
      return fail("Please review and confirm your full name.", 400);

    const { data, error } = await supabase
      .from("auth_accounts")
      .update({ name, name_confirmed_at: new Date().toISOString() })
      .eq("id", user.id)
      .eq("provider_user_id", user.providerUserId)
      .is("name_confirmed_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("Your account has already completed sign-up.", 409);
    return ok({
      destination: user.role === ROLES.ALUMNI ? "/alumni" : "/admin",
    });
  } catch (error) {
    console.error("Account sign-up failed:", error);
    return fail("Unable to save your name. Please try again.", 500);
  }
}
