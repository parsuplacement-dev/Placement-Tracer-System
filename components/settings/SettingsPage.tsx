import {
  LuCircleHelp,
  LuInfo,
  LuMail,
  LuShieldCheck,
  LuUserRound,
} from "@/components/ui/icons";

import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  InfoAccordion,
  type InfoAccordionItem,
} from "@/components/settings/InfoAccordion";
import { MotionPreference } from "@/components/settings/MotionPreference";
import { ColorThemePreference } from "@/components/settings/ColorThemePreference";
import { AuditLogSection } from "@/components/settings/AuditLogSection";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { type Role, ROLES } from "@/types";

interface SettingsPageProps {
  name: string;
  email: string;
  role: Role;
  pictureUrl: string | null;
}

const alumniInformation: InfoAccordionItem[] = [
  {
    id: "access",
    title: "Signing in to the Tracer System",
    content:
      "Use your Google account, including a personal or university account. The system does not maintain a separate password for your Tracer System access.",
  },
  {
    id: "response",
    title: "Keeping your tracer response current",
    content:
      "Return to the Responses page whenever your contact, education, or employment information changes so the university has an up-to-date alumni record.",
  },
  {
    id: "data-use",
    title: "How submitted information is used",
    content:
      "Tracer response information supports alumni tracking, institutional planning, program evaluation, and authorized university reporting.",
  },
];

const adminInformation: InfoAccordionItem[] = [
  {
    id: "access",
    title: "Administrator access",
    content:
      "Administrator access is tied to your Google account and the admin role assigned to your Tracer System account.",
  },
  {
    id: "accounts",
    title: "Managing alumni accounts",
    content:
      "Use the Accounts area to review user records and roles. New eligible Google sign-ins are registered as alumni by default.",
  },
  {
    id: "reporting",
    title: "Response review and exports",
    content:
      "Use response and account exports only for authorized university operations, institutional reporting, and alumni tracer activities.",
  },
];

const coordinatorInformation: InfoAccordionItem[] = [
  {
    id: "access",
    title: "Coordinator access",
    content:
      "Your administrator assigns the campuses, colleges, and programs whose tracer responses you may manage.",
  },
  {
    id: "reporting",
    title: "Scoped response review and exports",
    content:
      "Response lists, manual entries, documents, dashboard totals, and exports are limited to your current assignments.",
  },
];

export default function SettingsPage({
  name,
  email,
  role,
  pictureUrl,
}: SettingsPageProps) {
  const informationItems =
    role === ROLES.ADMIN
      ? adminInformation
      : role === ROLES.COORDINATOR
        ? coordinatorInformation
        : alumniInformation;

  return (
    <div className="w-full space-y-5 pb-10 sm:space-y-6 sm:pb-16">
      <header className="rounded-3xl border border-border bg-card/80 p-5 shadow-lg sm:p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-base">
          Personalize your display and review your Tracer System access.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <main className="min-w-0 space-y-5 sm:space-y-6">
          <ColorThemePreference />
          <MotionPreference />
          {role === ROLES.ADMIN && <AuditLogSection />}

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-2xl bg-secondary p-3 text-muted-foreground">
                <LuInfo aria-hidden="true" size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  System information
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Guidance relevant to your {role} access.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <InfoAccordion items={informationItems} />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-muted p-5 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-2xl bg-card p-3 text-muted-foreground shadow-sm">
                <LuCircleHelp aria-hidden="true" size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  Help and support
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  For access problems, incorrect account information, or
                  technical issues, contact the ParSU Placement Unit Office or
                  your designated Tracer System administrator.
                </p>
              </div>
            </div>
          </section>
        </main>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-4 border-b border-border p-5">
              <ProfileAvatar name={name} pictureUrl={pictureUrl} size={56} />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  Account profile
                </h2>
                <p className="text-sm text-muted-foreground">
                  Managed through Google
                </p>
              </div>
            </div>

            <dl className="divide-y divide-border">
              <div className="flex items-start gap-3 p-5">
                <LuUserRound
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-muted-foreground"
                  size={18}
                />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-foreground">
                    {name}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3 p-5">
                <LuMail
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-muted-foreground"
                  size={18}
                />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </dt>
                  <dd className="mt-1 break-all text-sm font-medium text-foreground">
                    {email}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3 p-5">
                <LuShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-muted-foreground"
                  size={18}
                />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Access
                  </dt>
                  <dd className="mt-1 text-sm font-medium capitalize text-foreground">
                    {role}
                  </dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Session</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Sign out when you are finished, especially on a shared device.
            </p>
            <div className="mt-4">
              <SignOutButton />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
