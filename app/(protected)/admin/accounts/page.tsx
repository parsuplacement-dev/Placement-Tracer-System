import AccountsWorkspace from "@/components/admin/accounts/AccountsWorkspace";
import { requireAdmin } from "@/lib/auth";

export default async function AccountsPage() {
  const user = await requireAdmin();
  return <AccountsWorkspace currentUserId={user.id} />;
}
