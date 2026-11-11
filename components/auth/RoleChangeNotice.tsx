"use client";

import { useEffect } from "react";

import { useToast } from "@/components/ui/Toast";

export default function RoleChangeNotice({
  hasNotice,
}: {
  hasNotice: boolean;
}) {
  const { showToast } = useToast();

  useEffect(() => {
    if (!hasNotice) return;
    let active = true;

    async function consumeNotice() {
      try {
        const response = await fetch("/api/auth/role-change-notice", {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) return;

        const result = (await response.json()) as {
          notice?: unknown;
        };
        if (active && typeof result.notice === "string") {
          showToast({
            message: result.notice,
            type: "success",
            duration: 7000,
          });
        }
      } catch {}
    }

    void consumeNotice();
    return () => {
      active = false;
    };
  }, [hasNotice, showToast]);

  return null;
}
