import type { NextConfig } from "next";

const developmentScriptPolicy =
  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${developmentScriptPolicy}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.googleusercontent.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://accounts.google.com https://www.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; object-src 'none'; upgrade-insecure-requests`,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/api/admin/files/:fileId/content",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
