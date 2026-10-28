import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Dynamic/private pages retain their existing no-store boundaries. No R2 activation required.
export default defineCloudflareConfig({
  incrementalCache: "dummy",
  tagCache: "dummy",
  queue: "dummy",
  routePreloadingBehavior: "none",
});
