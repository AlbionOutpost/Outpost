import { DurableObject } from "cloudflare:workers";
import app from "../../.open-next/worker.js";
import { requestBudget, secureResponse } from "./request-budget";
import { edgeCacheEntry } from "./edge-cache";
import { pageCacheEntry, pageFromStore, pageToStore } from "./page-cache";
import { boundedContext, withDeadline } from "./deadline";

/* The edge gateway: www redirect, edge cache, per-address budgets, then the OpenNext app in this
 * same Worker (CPU-billed). docs/ARCHITECTURE.md § albionoutpost-web. */

/** Retired 9 Nov 2026: nothing routes here and no binding reaches it. The class stays exported
 * for one release so this deploy needs no Durable Object migration and can still be rolled back;
 * the next release deletes it with a `deleted_classes` migration (docs/OPERATIONS.md). It never
 * stored anything; the alarm clears any schedule an old object may still hold. */
export class OutpostSession extends DurableObject<OutpostWebEnv> {
  async fetch() {
    return new Response("Gone", { status: 410, headers: { "Cache-Control": "no-store" } });
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

const worker = {
  async fetch(request: Request, env: OutpostWebEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.hostname === "www.albionoutpost.com") {
      url.hostname = "albionoutpost.com";
      url.protocol = "https:";
      url.port = "";
      return secureResponse(Response.redirect(url.toString(), 308), request);
    }
    const cache = typeof caches !== "undefined" ? caches.default : null;
    // Pages are keyed per deploy: a kept page names that build's script chunks.
    const page = cache ? pageCacheEntry(request, env.CF_VERSION_METADATA?.id ?? "") : null;
    const entry = cache && !page ? edgeCacheEntry(request) : null;
    // A cache hit is answered before the rate limit and the app: it costs almost no CPU.
    if (cache && (page || entry)) {
      const hit = await cache.match((page || entry)!.key).catch(() => undefined);
      if (hit && page) {
        const renewed = await pageFromStore(hit).catch(() => null);
        if (renewed) return secureResponse(renewed, request);
      } else if (hit) {
        const answer = new Response(hit.body, hit);
        answer.headers.set("Cache-Control", "private, max-age=60");
        answer.headers.set("X-Outpost-Edge", "hit");
        return secureResponse(answer, request);
      }
    }
    const denial = await requestBudget(request, {
      requests: env.EDGE_REQUESTS,
      search: env.EDGE_SEARCH,
      itemPrices: env.EDGE_ITEM_PRICES,
      market: env.EDGE_MARKET,
    });
    if (denial) {
      denial.headers.set("Cache-Control", "private, no-store");
      return secureResponse(denial, request);
    }
    const response = await withDeadline(app.fetch(request, env, boundedContext(ctx)));
    const result = new Response(response.body, response);
    if (cache && page && response.status === 200) {
      // The page streams to the visitor; its copy is checked and kept once the render ends.
      const copy = result.clone();
      ctx.waitUntil(
        pageToStore(copy, page.ttl)
          .then((stored) => stored && cache.put(page.key, stored))
          .catch(() => {}),
      );
    }
    // An answer with a failed part (`X-Outpost-Partial`) is served but never kept.
    if (cache && entry && response.status === 200 && !response.headers.has("X-Outpost-Partial")) {
      const body = await result.clone().arrayBuffer();
      const stored = new Response(body, {
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Cache-Control": `public, max-age=${entry.ttl}`,
        },
      });
      ctx.waitUntil(cache.put(entry.key, stored).catch(() => {}));
    }
    result.headers.set("Cache-Control", "private, no-store");
    return secureResponse(result, request);
  },
};
export default worker;
