"use client";

import { useState } from "react";
import { usePwa } from "@/components/pwa/PwaProvider";
import { Button } from "@/components/ui/button";

export function InstallApp() {
  const { prompt, installed, clearPrompt } = usePwa();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function install() {
    if (!prompt || busy) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Installation accepted. Follow any remaining browser instructions."
          : "Installation dismissed. You can still install from your browser menu.",
      );
    } catch {
      setMessage(
        "Use your browser menu to install the app or add it to your home screen.",
      );
    } finally {
      clearPrompt();
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">Install app</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {installed
          ? "You are using the installed Placement Tracer System."
          : "Add the Placement Tracer System to your device for quick access in its own window. An internet connection is required for your records and submissions."}
      </p>
      {!installed && (
        <div className="mt-4 space-y-3">
          {prompt && (
            <Button onClick={install} disabled={busy}>
              {busy ? "Installing…" : "Install app"}
            </Button>
          )}
          <p className="text-sm leading-6 text-muted-foreground">
            On iPhone or iPad, open this site in Safari, tap Share, then Add to
            Home Screen. In other supported browsers, use the address bar
            install icon or the browser menu. Installation requires HTTPS or
            localhost.
          </p>
        </div>
      )}
      <p role="status" className="mt-2 text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
}
