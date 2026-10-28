import type { NextConfig } from "next";
import { resolve } from "node:path";
const config: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  // Remove the measured initial HTML → stylesheet render-blocking round trip.
  // Re-evaluate the HTML/cache tradeoff when the framework's experimental API changes.
  // OpenNext embeds each page's inline CSS in its manifest. Across all routes that adds
  // 13.9 MB of repeated manifest code (4.0 MiB compressed total Worker). Cloudflare serves
  // shared static stylesheets; the measured Node deployment keeps its inline-CSS behavior.
  experimental: { inlineCss: process.env.OUTPOST_RUNTIME !== "cloudflare" },
  ...(process.env.OUTPOST_RUNTIME === "cloudflare"
    ? ({
        serverExternalPackages: [],
        images: { unoptimized: true },
        webpack(config, { webpack }) {
          const replacements = new Map([
            [resolve("src/lib/database-driver.ts"), resolve("cloudflare/database/web-driver.ts")],
            [resolve("src/lib/prisma-runtime.ts"), resolve("cloudflare/database/prisma-web.ts")],
            [resolve("src/lib/redis.ts"), resolve("cloudflare/database/redis-web.ts")],
            [resolve("src/lib/grind-library.ts"), resolve("cloudflare/database/library-web.ts")],
            [resolve("src/lib/inflight-cache.ts"), resolve("cloudflare/database/inflight-web.ts")],
          ]);
          config.plugins.push(
            new webpack.NormalModuleReplacementPlugin(
              /database-driver|prisma-runtime|inflight-cache|(?:^|\/)redis(?:\.ts)?$|grind-library(?:\.ts)?$/,
              (resource: { request: string; context: string }) => {
                const request = resource.request.startsWith("@/")
                  ? resolve("src", resource.request.slice(2))
                  : resolve(resource.context, resource.request);
                const replacement = replacements.get(
                  request.endsWith(".ts") ? request : request + ".ts",
                );
                if (replacement) resource.request = replacement;
              },
            ),
          );
          return config;
        },
      } satisfies Partial<NextConfig>)
    : {}),
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
