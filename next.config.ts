import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  // Remove the measured initial HTML → stylesheet render-blocking round trip.
  // Re-evaluate the HTML/cache tradeoff when the framework's experimental API changes.
  experimental: { inlineCss: true },
  async headers() {
    return [
      {
        source: "/invitations/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default config;
