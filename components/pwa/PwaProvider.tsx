"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PwaContext = createContext<{
  prompt: InstallPromptEvent | null;
  installed: boolean;
  clearPrompt: () => void;
}>({ prompt: null, installed: false, clearPrompt: () => {} });

export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () =>
      setInstalled(
        standalone.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    updateInstalled();
    standalone.addEventListener("change", updateInstalled);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Development assets change without content hashes and must stay uncached.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error: unknown) => {
          console.warn("PWA offline support could not be registered.", error);
        });
    }

    return () => {
      standalone.removeEventListener("change", updateInstalled);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <PwaContext.Provider
      value={{ prompt, installed, clearPrompt: () => setPrompt(null) }}
    >
      {children}
    </PwaContext.Provider>
  );
}
