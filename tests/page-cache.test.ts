import { describe, expect, it } from "vitest";
import {
  freshNonce,
  pageCacheEntry,
  pageFromStore,
  pageToStore,
} from "../cloudflare/web/page-cache";

const version = "v-1";
const req = (path: string, headers: Record<string, string> = {}, method = "GET") =>
  new Request(`https://albionoutpost.com${path}`, { method, headers });
const key = (path: string, headers?: Record<string, string>) =>
  pageCacheEntry(req(path, headers), version)?.key.url ?? null;
const base = "https://albionoutpost.com/__page/v-1";

const nonce = freshNonce();
const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
const body = `<!DOCTYPE html><html><head><link rel="preload" as="script" nonce="${nonce}" href="/a.js"/></head><body><script nonce="${nonce}">self.__next_f.push([1,"0:{\\"nonce\\":\\"${nonce}\\"}"])</script><p>Guides</p></body></html>`;
const rendered = (
  init: { status?: number; headers?: Record<string, string>; html?: string } = {},
) =>
  new Response(init.html ?? body, {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": policy,
      "Cache-Control": "private, no-store",
      Link: `</f.woff2>; rel=preload; as="font"; nonce="${nonce}"`,
      ...init.headers,
    },
  });

describe("page cache allowlist", () => {
  it("keeps the public pages and their TTLs", () => {
    const ttl = (path: string) => pageCacheEntry(req(path), version)?.ttl ?? null;
    expect(ttl("/")).toBe(60);
    expect(ttl("/tools/kill-feed")).toBe(60);
    expect(ttl("/tools/market")).toBe(60);
    expect(ttl("/market-data")).toBe(60);
    expect(ttl("/builds")).toBe(60);
    expect(ttl("/compositions")).toBe(60);
    expect(ttl("/groups")).toBe(60);
    expect(ttl("/builds/library/claymore-zvz")).toBe(86_400);
    expect(ttl("/compositions/library/brawl-5")).toBe(86_400);
    expect(ttl("/guides")).toBe(86_400);
    expect(ttl("/guides/refining")).toBe(86_400);
    expect(ttl("/tools")).toBe(300);
    expect(ttl("/tools/crafting")).toBe(300);
    expect(ttl("/items")).toBe(300);
    expect(ttl("/items/T4_BAG@1")).toBe(120);
  });
  it("never keeps editors, account, admin, sign-in, API, a player's own build, comp or Team page, or unknown routes", () => {
    for (const path of [
      "/builds/new",
      "/builds/clx0abc123def456ghi789jkl",
      "/compositions/clx0abc123def456ghi789jkl",
      "/groups/the-red-hand",
      "/builds/abc/edit",
      "/compositions/new",
      "/compositions/abc/edit",
      "/groups/new",
      "/dashboard",
      "/settings",
      "/signin",
      "/admin",
      "/admin/users",
      "/favorites",
      "/timers",
      "/giveaways",
      "/players/abc",
      "/invitations/abc",
      "/legal",
      "/api/landing?region=europe",
      "/api/auth/session",
      "/tools/death-feed",
      "/tools/unknown",
      "/guides/a/b",
      "/builds/",
    ])
      expect(key(path), path).toBeNull();
  });
});

describe("page cache key", () => {
  it("keys on the deploy, the theme and server cookies, and the exact query", () => {
    expect(key("/guides")).toBe(`${base}/dark/-/guides`);
    expect(key("/builds?source=library&view=list")).toBe(
      `${base}/dark/-/builds?source=library&view=list`,
    );
    // The page embeds its query in the router payload, so the order is part of the page.
    expect(key("/builds?view=list&source=library")).toBe(
      `${base}/dark/-/builds?view=list&source=library`,
    );
    expect(key("/", { Cookie: "atlas-theme=light; atlas-region=asia" })).toBe(
      `${base}/light/asia/`,
    );
    expect(key("/", { Cookie: "atlas-region=americas;atlas-theme=dark; __gads=x" })).toBe(
      `${base}/dark/americas/`,
    );
    expect(pageCacheEntry(req("/"), "v-2")!.key.url).toBe(
      "https://albionoutpost.com/__page/v-2/dark/-/",
    );
    expect(pageCacheEntry(req("/"), "")).toBeNull();
  });
  it("does not keep tracking, repeated or oversized queries", () => {
    expect(key("/?utm_source=discord")).toBeNull();
    expect(key("/guides?fbclid=abc")).toBeNull();
    expect(key("/builds?gclid=1&q=axe")).toBeNull();
    expect(key("/builds?q=a&q=b")).toBeNull();
    expect(key(`/builds?q=${"a".repeat(600)}`)).toBeNull();
  });
  it("never keeps a signed-in or identity-carrying request", () => {
    for (const cookie of [
      "next-auth.session-token=abc",
      "__Secure-next-auth.session-token=abc",
      "__Secure-next-auth.session-token.0=abc",
      "atlas-theme=light; __Secure-next-auth.session-token=abc",
      "next-auth.csrf-token=abc",
      "__Host-next-auth.csrf-token=abc",
      "next-auth.callback-url=%2F",
      "my-session=1",
      "api_token=1",
      "Authorization=1",
    ])
      expect(key("/", { Cookie: cookie }), cookie).toBeNull();
  });
  it("skips cookies the render could read differently from the key", () => {
    for (const cookie of [
      "atlas-region=%61mericas", // Next decodes this to americas
      "atlas-region=mars",
      "atlas-theme=Light",
      "atlas-theme",
      "atlas-theme=light; atlas-theme=dark",
      "atlas-theme =light",
      " atlas-region=asia;atlas-region=asia",
    ])
      expect(key("/", { Cookie: cookie }), cookie).toBeNull();
  });
  it("keeps RSC, prefetch and router requests apart from the HTML", () => {
    expect(key("/guides", { RSC: "1" })).toBeNull();
    expect(key("/guides", { "Next-Router-State-Tree": "%5B%5D" })).toBeNull();
    expect(key("/guides", { "Next-Router-Prefetch": "1" })).toBeNull();
    expect(key("/guides", { "Next-Url": "/builds" })).toBeNull();
    expect(key("/guides", { "Next-Action": "abc" })).toBeNull();
    expect(key("/guides?_rsc=1x2y3")).toBeNull();
    expect(pageCacheEntry(req("/guides", {}, "HEAD"), version)).toBeNull();
    expect(pageCacheEntry(req("/guides", {}, "POST"), version)).toBeNull();
  });
});

describe("page cache storage", () => {
  it("keeps a complete public page with its policy and preloads", async () => {
    const stored = await pageToStore(rendered(), 300);
    expect(stored).not.toBeNull();
    expect(stored!.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(stored!.headers.get("Content-Security-Policy")).toBe(policy);
    expect(stored!.headers.get("Link")).toContain(nonce);
    expect(await stored!.text()).toBe(body);
  });
  it("never keeps cookies, errors, partial, flight or cut-off answers", async () => {
    const refused = [
      rendered({ headers: { "Set-Cookie": "next-auth.csrf-token=x; Path=/" } }),
      rendered({ status: 404 }),
      rendered({ status: 500 }),
      rendered({ headers: { "X-Outpost-Partial": "1" } }),
      rendered({ headers: { "Content-Type": "text/x-component" } }),
      rendered({ headers: { "Content-Security-Policy": "default-src 'self'" } }),
      rendered({ html: body.slice(0, -20) }),
      rendered({
        html: body.replace("<p>", '<template data-dgst="NEXT_HTTP_ERROR_FALLBACK;404">'),
      }),
      rendered({
        html: body.replace("<p>", '<template data-dgst="NEXT_REDIRECT;replace;/x;307">'),
      }),
      rendered({ html: body.replace("<p>", '<template data-dgst="1234567">') }),
    ];
    for (const response of refused) expect(await pageToStore(response, 60)).toBeNull();
  });
});

describe("page cache nonce", () => {
  it("gives every hit a fresh nonce that matches its policy, body and preloads", async () => {
    const stored = (await pageToStore(rendered(), 60))!;
    const hits = await Promise.all([1, 2].map(() => pageFromStore(stored.clone())));
    const seen = new Set<string>();
    for (const hit of hits) {
      expect(hit).not.toBeNull();
      const csp = hit!.headers.get("Content-Security-Policy")!;
      const fresh = csp.match(/'nonce-([A-Za-z0-9+/]{48})'/)![1];
      const html = await hit!.text();
      expect(fresh).not.toBe(nonce);
      expect(html).not.toContain(nonce);
      expect(csp).not.toContain(nonce);
      // Two attributes and the flight payload's prop, all renewed.
      expect(html.split(fresh).length - 1).toBe(3);
      expect(html.length).toBe(body.length);
      expect(hit!.headers.get("Link")).toBe(`</f.woff2>; rel=preload; as="font"; nonce="${fresh}"`);
      expect(hit!.headers.get("Cache-Control")).toBe("private, no-store");
      expect(hit!.headers.get("X-Outpost-Edge")).toBe("hit");
      seen.add(fresh);
    }
    expect(seen.size).toBe(2);
  });
  it("leaves a nonce attribute that did not come from the render untouched", async () => {
    const injected = body.replace(
      "<p>",
      '<p nonce="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA">',
    );
    const hit = await pageFromStore((await pageToStore(rendered({ html: injected }), 60))!);
    expect(await hit!.text()).toContain('nonce="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"');
  });
  it("refuses a stored page without a nonce to renew", async () => {
    const stored = new Response(body, {
      headers: { "Content-Security-Policy": "default-src 'self'" },
    });
    expect(await pageFromStore(stored)).toBeNull();
  });
});
