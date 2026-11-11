"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";
import {
  LuChevronRight,
  LuBookOpen,
  LuBriefcaseBusiness,
  LuChartNoAxesCombined,
  LuCheck,
  LuCircleAlert,
  LuFileText,
  LuGraduationCap,
  LuShieldCheck,
  LuUsersRound,
} from "@/components/ui/icons";

import Modal, { ModalNotice } from "@/components/ui/Modal";

const tracerBenefits = [
  {
    icon: LuBriefcaseBusiness,
    title: "Graduate outcomes",
    description: "Understand employment, career paths, and further study.",
  },
  {
    icon: LuChartNoAxesCombined,
    title: "Better programs",
    description: "Use alumni experience to support academic improvement.",
  },
  {
    icon: LuUsersRound,
    title: "Stronger connections",
    description: "Help the university stay connected with its graduates.",
  },
];

const termsSections = [
  {
    title: "1. Purpose and acceptance",
    body: "This Tracer System supports authorized graduate tracer activities of the ParSU Placement Unit. By signing in and using the system, you agree to these terms and to applicable university policies. If you do not agree, do not submit information through the system and contact the Placement Unit for assistance.",
  },
  {
    title: "2. Authorized access",
    body: "Access is intended for eligible alumni and authorized university personnel. You must use your own official account, keep access credentials secure, and avoid allowing another person to use your session. Administrative access must be used only for assigned university duties.",
  },
  {
    title: "3. Accurate and appropriate information",
    body: "Provide information that is accurate, current, and relevant to the tracer study. Do not submit unlawful, misleading, malicious, or unrelated material. You may return to update your response when your contact, education, or employment information changes, subject to the study status and system rules.",
  },
  {
    title: "4. Use of submitted information",
    body: "Information may be used for alumni tracking, graduate outcome analysis, institutional planning, program evaluation, accreditation support, authorized reporting, and related placement services. Reports should use aggregated or appropriately limited information whenever individual identification is unnecessary.",
  },
  {
    title: "5. Privacy and confidentiality",
    body: "The university should handle personal information in accordance with its approved privacy, records-management, and information-security policies. Access should be limited to authorized personnel with a legitimate operational need. Do not upload sensitive information that the form does not request.",
  },
  {
    title: "6. Google authentication and connected services",
    body: "The system uses Google sign-in to verify access and may use authorized Google services for managed documents. Google services are governed by their own terms and privacy practices. Signing in does not authorize the system to access unrelated Google account content.",
  },
  {
    title: "7. Availability and records",
    body: "The university may maintain, correct, archive, export, or remove records as needed for authorized operations, retention requirements, security, and data quality. Service availability is not guaranteed at all times, particularly during maintenance or events outside the university's reasonable control.",
  },
  {
    title: "8. Prohibited activity",
    body: "You must not attempt to bypass access controls, inspect another person's records without authorization, disrupt the service, introduce harmful code, scrape data, or use exported information for unauthorized personal, commercial, discriminatory, or harmful purposes.",
  },
  {
    title: "9. Changes and questions",
    body: "These terms may be updated when system functions or university requirements change. Material changes should be communicated through an appropriate university channel. Questions, correction requests, or privacy concerns should be directed to the ParSU Placement Unit or the university office responsible for data protection.",
  },
];

export default function SignInPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [showTerms, setShowTerms] = useState(false);
  const [showTracerGuide, setShowTracerGuide] = useState(false);

  function handleGoogleSignIn() {
    window.location.href = "/api/auth/google";
  }

  return (
    <>
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden bg-primary px-6 py-9 text-primary-foreground sm:px-9 sm:py-12 lg:p-12">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-radial from-transparent to-surface/75" />
            <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-radial from-transparent to-surface/20" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
                <LuGraduationCap aria-hidden="true" />
                ParSU Placement Unit
              </div>

              <h1 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Your journey after graduation matters.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-primary-foreground/80 sm:text-base">
                Share your graduate experience and help Partido State University
                strengthen its programs, services, and support for future
                graduates.
              </p>

              <div className="mt-8 grid gap-3">
                {tracerBenefits.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <div
                      key={benefit.title}
                      className="flex items-start gap-3 rounded-2xl bg-primary-foreground/10 p-4"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-foreground/10">
                        <Icon aria-hidden="true" size={18} />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold">
                          {benefit.title}
                        </h2>
                        <p className="mt-0.5 text-sm leading-5 text-primary-foreground/75">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="inverse"
                size="inline"
                onClick={() => setShowTracerGuide(true)}
                className="mt-6"
              >
                <LuBookOpen aria-hidden="true" />
                Learn about tracer studies
                <LuChevronRight aria-hidden="true" />
              </Button>
            </div>
          </section>

          <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <LuGraduationCap aria-hidden="true" size={25} />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Placement Tracer System
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign in securely with your official university Google account to
                access your tracer study.
              </p>

              {error === "unauthorized_domain" && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  <LuCircleAlert
                    aria-hidden="true"
                    size={20}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    Please use your official @parsu.edu.ph Google account.
                  </span>
                </div>
              )}

              {error === "oauth_failed" && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  <LuCircleAlert
                    aria-hidden="true"
                    size={20}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    Google sign-in failed or was cancelled. Please try again.
                  </span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="wide"
                onClick={handleGoogleSignIn}
                className="mt-7"
              >
                <FcGoogle aria-hidden="true" size={23} />
                Sign in with Google
              </Button>

              <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <LuShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-success"
                  />
                  Authentication is handled through your official Google
                  account.
                </div>
                <div className="flex items-start gap-2">
                  <LuCheck
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-success"
                  />
                  Use the same account associated with your university record.
                </div>
              </div>

              <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
                By continuing, you acknowledge the{" "}
                <Button
                  type="button"
                  variant="link"
                  size="inline"
                  onClick={() => setShowTerms(true)}
                >
                  Terms and Conditions
                </Button>
                .
              </p>
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={showTracerGuide}
        onClose={() => setShowTracerGuide(false)}
        title="Understanding graduate tracer studies"
        description="Why universities follow graduate outcomes and how your response helps"
        width="lg"
        fitContent
      >
        <div className="space-y-6 text-sm leading-7 text-muted-foreground">
          <section>
            <h3 className="text-base font-semibold text-foreground">
              What is a tracer study?
            </h3>
            <p className="mt-2">
              A graduate tracer study is a structured follow-up of alumni after
              they leave the university. It looks at where graduates go, how
              they transition into employment or further education, and how
              their university experience relates to the opportunities and
              challenges they encounter.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {[
              [
                "Measure graduate outcomes",
                "Build a clearer picture of employment, job search, career movement, further study, and other post-graduation paths.",
              ],
              [
                "Improve academic programs",
                "Help academic units understand which knowledge and competencies graduates find useful and where curricula may be strengthened.",
              ],
              [
                "Guide student support",
                "Inform career preparation, placement services, alumni engagement, and other support offered to students and graduates.",
              ],
              [
                "Support planning and reporting",
                "Provide evidence for institutional planning, program evaluation, quality assurance, accreditation, and authorized reports.",
              ],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-muted/50 p-4"
              >
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 leading-6">{body}</p>
              </div>
            ))}
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">
              What information may be requested?
            </h3>
            <p className="mt-2">
              A tracer questionnaire may ask about contact details, education,
              professional development, employment status, job characteristics,
              the transition to a first job, and the relevance of university
              learning to work. Questions can vary by study period and program.
            </p>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <h3 className="font-semibold text-foreground">
              Why your response matters
            </h3>
            <p className="mt-1">
              Each complete and accurate response makes the overall findings
              more representative. Honest answers—including experiences of
              unemployment, career changes, further study, or work outside your
              degree field—are valuable because they help the university see the
              full range of graduate experiences.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">
              How results should be used
            </h3>
            <p className="mt-2">
              Tracer information should support legitimate university purposes
              and be handled by authorized personnel. Findings are most useful
              when reported in aggregate, interpreted carefully, and combined
              with other evidence rather than used to judge an individual
              graduate.
            </p>
          </section>
        </div>
      </Modal>

      <Modal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms and Conditions"
        description="Placement Tracer System usage terms"
        width="lg"
        fitContent
      >
        <ModalNotice
          icon={<LuFileText aria-hidden="true" />}
          tone="warning"
          className="mb-5"
        >
          <p>
            These terms describe responsible use of this system. University
            privacy notices and approved institutional policies continue to
            apply where relevant.
          </p>
        </ModalNotice>

        <div className="space-y-5">
          {termsSections.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {section.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </Modal>
    </>
  );
}
