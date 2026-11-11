import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { MotionPreferenceProvider } from "@/components/settings/MotionPreference";
import { PwaProvider } from "@/components/pwa/PwaProvider";

export const metadata: Metadata = {
  title: "Placement Tracer System (Demo)",
  description: "Tracer System by the ParSU Placement Unit (Demo)",
  appleWebApp: {
    capable: true,
    title: "ParSU Tracer",
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8fafc",
};

const themeScript = `
  try {
    const savedTheme = localStorage.getItem("tracer-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const followsSystem = savedTheme !== "light" && savedTheme !== "dark";
    const isDark = savedTheme === "dark" || (followsSystem && prefersDark);
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    root.style.removeProperty("background-color");
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      isDark ? "#020617" : "#f8fafc"
    );
  } catch {}
`;

const motionScript = `
  try {
    document.documentElement.classList.toggle(
      "reduce-motion",
      localStorage.getItem("tracer-reduce-motion") === "true"
    );
  } catch {}
`;

const colorThemeScript = `
  try {
    const savedColorTheme = localStorage.getItem("tracer-color-theme");
    document.documentElement.dataset.colorTheme =
      savedColorTheme === "monotone"
        ? "gray"
        : savedColorTheme === "green" || savedColorTheme === "purple" || savedColorTheme === "gray"
        ? savedColorTheme
        : "blue";
  } catch {}
`;

function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <InlineScript html={themeScript} />
        <InlineScript html={colorThemeScript} />
        <InlineScript html={motionScript} />
      </head>
      <body className="relative min-h-full w-full">
        <MotionPreferenceProvider>
          <PwaProvider>
            <ToastProvider>{children}</ToastProvider>
          </PwaProvider>
        </MotionPreferenceProvider>
      </body>
    </html>
  );
}
