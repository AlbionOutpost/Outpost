import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Dynamic/private pages retain their existing no-store boundaries. No R2 activation required.
const config = defineCloudflareConfig({
  incrementalCache: "dummy",
  tagCache: "dummy",
  queue: "dummy",
  routePreloadingBehavior: "none",
});
// This port uses explicit server module aliases; the installed Next guide requires webpack.
config.buildCommand =
  "node node_modules/prisma/build/index.js generate && node node_modules/next/dist/bin/next build --webpack";
export default config;
