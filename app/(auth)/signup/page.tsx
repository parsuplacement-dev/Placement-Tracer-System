import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { needsSignupName } from "@/lib/auth/signup-name";
import { ROLES } from "@/types";
import SignupForm from "@/components/auth/SignupForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user && !needsSignupName(user)) {
    redirect(user.role === ROLES.ALUMNI ? "/alumni" : "/admin");
  }
  return <SignupForm authenticated={Boolean(user)} />;
}
