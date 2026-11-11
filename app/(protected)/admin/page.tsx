import { IconLink as Link } from "@/components/ui/icon-link";
import {
  LuChevronRight,
  LuCalendarClock,
  LuChartNoAxesCombined,
  LuCircleCheck,
  LuBriefcaseBusiness,
  LuFileSpreadsheet,
  LuFolderOpen,
  LuGraduationCap,
  LuPlus,
  LuUsersRound,
} from "@/components/ui/icons";

import RecentResponses from "@/components/admin/dashboard/RecentResponses";
import EmploymentPieChart from "@/components/admin/dashboard/EmploymentPieChart";
import { buttonVariants } from "@/components/ui/button-variants";
import { getAllowedProgramValues, isAdmin, requireStaff } from "@/lib/auth";
import { PROGRAMS } from "@/lib/programs/catalog";
import { getAdminDashboardSummary } from "@/lib/repositories/admin-responses.repository";
import { listStudyPeriods } from "@/lib/repositories/forms.repository";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Administrator";
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export default async function AdminPage() {
  const user = await requireStaff();
  const allowedProgramValues = getAllowedProgramValues(user);
  const [studies, summary] = await Promise.all([
    listStudyPeriods(),
    getAdminDashboardSummary(allowedProgramValues),
  ]);
  const openStudy = studies.find((study) => study.status === "open") ?? null;
  const openCounts = summary.studyCounts.find(
    (counts) => counts.study_period_id === openStudy?.id,
  );
  const openResponseCount = openCounts?.response_count ?? 0;
  const openSubmittedCount = openCounts?.submitted_count ?? 0;
  const submissionRate = openResponseCount
    ? Math.round((openSubmittedCount / openResponseCount) * 100)
    : 0;
  const employedCount = summary.employmentCounts.employed;
  const employmentAnsweredCount =
    employedCount +
    summary.employmentCounts.unemployed +
    summary.employmentCounts.never_employed;
  const employmentRate = employmentAnsweredCount
    ? Math.round((employedCount / employmentAnsweredCount) * 100)
    : 0;
  const employmentBreakdown = [
    {
      status: "Yes",
      label: "Employed",
      count: employedCount,
      colorClass: "bg-emerald-600 dark:bg-emerald-500",
    },
    {
      status: "No",
      label: "Not employed",
      count: summary.employmentCounts.unemployed,
      colorClass: "bg-orange-600 dark:bg-orange-500",
    },
    {
      status: "Never Employed",
      label: "Never employed",
      count: summary.employmentCounts.never_employed,
      colorClass: "bg-blue-600 dark:bg-blue-500",
    },
  ];
  const programCounts = summary.programCounts;
  const maxProgramCount = programCounts[0]?.[1] ?? 0;
  const programNames = new Map(
    PROGRAMS.map((program) => [program.value, program.label]),
  );
  const recentResponses = summary.recentResponses;

  const metrics = [
    {
      label: "Active participation",
      value: openResponseCount,
      detail: openStudy ? `In ${openStudy.academicYear}` : "No open study",
      icon: LuFileSpreadsheet,
    },
    {
      label: "Completion rate",
      value: `${submissionRate}%`,
      detail: `${openSubmittedCount} of ${openResponseCount} ${pluralize(openResponseCount, "response")} submitted`,
      icon: LuCircleCheck,
    },
    {
      label: "Employment rate",
      value: `${employmentRate}%`,
      detail: `${employedCount} of ${employmentAnsweredCount} reporting ${pluralize(employmentAnsweredCount, "graduate")}`,
      icon: LuBriefcaseBusiness,
    },
    {
      label: "Programs represented",
      value: programCounts.filter(([program]) => program !== "Not specified")
        .length,
      detail: `${summary.submittedCount} submitted ${pluralize(summary.submittedCount, "response")} analyzed`,
      icon: LuGraduationCap,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
          <div className="min-w-0 flex-1 basis-72">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <LuChartNoAxesCombined aria-hidden="true" />
              {isAdmin(user)
                ? "Administration overview"
                : "Coordinator overview"}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Welcome back, {firstName(user.name)}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Monitor graduate tracer activity and continue the work that needs
              your attention.
            </p>
          </div>
          <Link
            href="/admin/responses"
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            View responses
            <LuChevronRight aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section
        aria-label="Tracer study metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                    {typeof metric.value === "number"
                      ? metric.value.toLocaleString()
                      : metric.value}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon aria-hidden="true" size={20} />
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {metric.detail}
              </p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Graduate outcomes
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                Employment status
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {employmentAnsweredCount} submitted{" "}
                {pluralize(employmentAnsweredCount, "response")} with an
                employment answer
              </p>
            </div>
            <span className="text-2xl font-semibold text-foreground">
              {employmentRate}%
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-7">
            <EmploymentPieChart slices={employmentBreakdown} />
            <div className="w-full min-w-0 space-y-3 sm:max-w-60">
              {employmentBreakdown.map((item) => {
                const percentage = employmentAnsweredCount
                  ? Math.round((item.count / employmentAnsweredCount) * 100)
                  : 0;
                return (
                  <div
                    key={item.status}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={`size-3 shrink-0 rounded-sm ${item.colorClass}`}
                    />
                    <span className="min-w-0 flex-1 font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {item.count} · {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Participation mix
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Responses by program
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Top programs among submitted responses
          </p>
          <div className="mt-6 space-y-4">
            {programCounts.length ? (
              programCounts.slice(0, 5).map(([program, count], index) => (
                <div
                  key={program}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2"
                >
                  <p
                    className="text-sm font-medium leading-5 text-foreground"
                    title={programNames.get(program) ?? program}
                  >
                    {programNames.get(program) ?? program}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {count}
                  </p>
                  <div className="col-span-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="dashboard-progress-bar h-full rounded-full bg-primary"
                      style={{
                        width: `${maxProgramCount ? (count / maxProgramCount) * 100 : 0}%`,
                        animationDelay: `${150 + index * 90}ms`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Program participation will appear after responses are submitted.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Active study
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                {openStudy?.title ?? "No study is currently open"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {openStudy
                  ? `${openStudy.academicYear} academic year`
                  : "Open a study period when you are ready to receive responses."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                openStudy
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {openStudy ? "Open" : "Inactive"}
            </span>
          </div>

          {openStudy ? (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col justify-center py-7">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-semibold text-foreground">
                      {openSubmittedCount.toLocaleString()}
                      <span className="text-base font-medium text-muted-foreground">
                        {" "}
                        / {openResponseCount.toLocaleString()}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Submitted out of recorded{" "}
                      {pluralize(openResponseCount, "response")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {submissionRate}% submitted
                  </p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="dashboard-progress-bar h-full rounded-full bg-primary"
                    style={{
                      width: `${submissionRate}%`,
                      animationDelay: "150ms",
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {isAdmin(user) && (
                  <Link
                    href="/admin/studies"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Manage study
                  </Link>
                )}
                <Link
                  href={`/admin/responses?study=${encodeURIComponent(openStudy.id)}`}
                  className={buttonVariants({ variant: "default" })}
                >
                  View study responses
                  <LuChevronRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : isAdmin(user) ? (
            <Link
              href="/admin/studies"
              className={`${buttonVariants({ variant: "default" })} mt-6`}
            >
              <LuPlus aria-hidden="true" />
              Manage studies
            </Link>
          ) : null}
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Quick actions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Common administration tools
          </p>
          <div className="mt-5 grid gap-2">
            {[
              ["Review responses", "/admin/responses", LuFileSpreadsheet],
              ...(isAdmin(user)
                ? [
                    ["Manage studies", "/admin/studies", LuCalendarClock],
                    ["Manage accounts", "/admin/accounts", LuUsersRound],
                    ["Browse files", "/admin/files", LuFolderOpen],
                  ]
                : []),
            ].map(([label, href, Icon]) => (
              <Link
                key={href as string}
                href={href as string}
                className="group flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-secondary text-muted-foreground transition-colors duration-200 group-hover:text-primary">
                  <Icon aria-hidden="true" size={18} />
                </span>
                {label as string}
                <LuChevronRight
                  aria-hidden="true"
                  className="ml-auto text-muted-foreground"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <RecentResponses responses={recentResponses} />
    </div>
  );
}
