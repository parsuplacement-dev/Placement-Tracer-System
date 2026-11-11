"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { LuGraduationCap, LuShieldCheck } from "@/components/ui/icons";
import {
  formatSignupName,
  signupNameSchema,
  type SignupName,
} from "@/lib/auth/signup-name";

const fields = [
  {
    key: "lastName",
    label: "Last name",
    autoComplete: "family-name",
    required: true,
  },
  {
    key: "firstName",
    label: "First name",
    autoComplete: "given-name",
    required: true,
  },
  {
    key: "middleName",
    label: "Middle name",
    autoComplete: "additional-name",
    required: false,
  },
  {
    key: "extensionName",
    label: "Extension",
    autoComplete: "honorific-suffix",
    required: false,
  },
] as const;

export default function SignupForm({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const [name, setName] = useState<SignupName>({
    lastName: "",
    firstName: "",
    middleName: "",
    extensionName: "",
  });
  const [review, setReview] = useState<SignupName | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = signupNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your name.");
      return;
    }
    setReview(parsed.data);
  }

  async function handleConfirm() {
    if (!review || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...review,
          confirmedName: formatSignupName(review),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message ?? "Unable to save your name.");
      window.location.assign(result.data.destination);
    } catch (error) {
      setReview(null);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save your name. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden bg-primary px-6 py-9 text-primary-foreground sm:px-9 sm:py-12 lg:p-12">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-radial from-transparent to-surface/75" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
                <LuGraduationCap aria-hidden="true" /> ParSU Placement Unit
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your journey after graduation matters.
              </h1>
              <p className="mt-4 text-sm leading-7 text-primary-foreground/80 sm:text-base">
                Join the Placement Tracer System and share your graduate
                experience with Partido State University.
              </p>
              <div className="mt-8 flex items-start gap-3 rounded-2xl bg-primary-foreground/10 p-4 text-sm leading-6">
                <LuShieldCheck aria-hidden="true" className="mt-1 shrink-0" />
                <p>
                  Using a non-ParSU Google account? Confirm your full name so
                  the university can recognize your account. ParSU accounts use
                  their Google profile name.
                </p>
              </div>
            </div>
          </section>
          <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Placement Tracer System
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {authenticated
                  ? "Complete your sign-up"
                  : "Create your account"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {authenticated
                  ? "Enter your full name as it should appear on your account. Middle name and extension are optional."
                  : "Continue with Google to get started."}
              </p>
              {authenticated ? (
                <form onSubmit={handleReview} className="mt-6 space-y-4">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label
                        htmlFor={field.key}
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        {field.label}
                        {field.required ? " *" : " (optional)"}
                      </label>
                      <Input
                        id={field.key}
                        name={field.key}
                        autoComplete={field.autoComplete}
                        required={field.required}
                        maxLength={field.key === "extensionName" ? 30 : 100}
                        placeholder={
                          field.key === "extensionName"
                            ? "e.g. Jr., III"
                            : undefined
                        }
                        value={name[field.key]}
                        disabled={busy}
                        onChange={(event) =>
                          setName({ ...name, [field.key]: event.target.value })
                        }
                      />
                    </div>
                  ))}
                  <p className="text-xs leading-5 text-muted-foreground">
                    Your account name will appear as First Middle Last
                    Extension. Extra spaces will be removed; capitalization
                    stays as entered.
                  </p>
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    variant="default"
                    size="wide"
                    disabled={busy}
                  >
                    Review full name
                  </Button>
                </form>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="wide"
                    className="mt-7"
                    onClick={() => window.location.assign("/api/auth/google")}
                  >
                    <FcGoogle aria-hidden="true" size={23} /> Continue with
                    Google
                  </Button>
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href="/signin"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
      <ConfirmationDialog
        open={review !== null}
        onClose={() => setReview(null)}
        onConfirm={handleConfirm}
        title="Check your full name"
        description="Please check the spelling, spacing, and capitalization before confirming."
        confirmLabel="Confirm and finish sign-up"
        cancelLabel="Edit name"
        busy={busy}
      >
        {review && (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Your account name
            </p>
            <p className="mt-2 break-words text-xl font-semibold leading-8 text-foreground sm:text-2xl">
              {formatSignupName(review)}
            </p>
          </div>
        )}
      </ConfirmationDialog>
    </>
  );
}
