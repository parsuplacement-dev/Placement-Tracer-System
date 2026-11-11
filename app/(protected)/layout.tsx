import { redirect } from "next/navigation";
import DashboardNavigation from "@/components/layout/DashboardNavigation";
import { getRole, requireUser } from "@/lib/auth";
import RoleChangeNotice from "@/components/auth/RoleChangeNotice";
import SessionKeepAlive from "@/components/auth/SessionKeepAlive";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await requireUser();
  const role = getRole(user);

  if (!role) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex min-h-svh w-full min-w-0">
      <RoleChangeNotice />
      <SessionKeepAlive />
      <DashboardNavigation role={role} />
      <main className="min-w-0 flex-1 px-4 sm:px-6">
        <div className="mx-auto min-h-full w-full max-w-6xl py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
