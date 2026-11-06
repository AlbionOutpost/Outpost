import { describe, expect, it } from "vitest";
import { edgeCacheEntry } from "../cloudflare/web/edge-cache";

const req = (path: string, init: RequestInit = {}) =>
  new Request(`https://albionoutpost.com${path}`, init);
const key = (path: string, init?: RequestInit) => edgeCacheEntry(req(path, init))?.key.url ?? null;

describe("edge cache for signed-out public answers", () => {
  it("normalises search queries and keeps them briefly", () => {
    expect(key("/api/search?q=%20Great%20%20AXE%20")).toBe(
      "https://albionoutpost.com/api/search?q=great%20axe",
    );
    expect(edgeCacheEntry(req("/api/search?q=bag"))!.ttl).toBe(120);
    expect(key("/api/search?q=a")).toBeNull();
  });
  it("keys the landing quote and top kills by validated server only", () => {
    expect(key("/api/landing/craft?region=europe")).toBe(
      "https://albionoutpost.com/api/landing/craft?region=europe&batches=1",
    );
    expect(key("/api/landing/craft?batches=3&region=asia&utm=x")).toBe(
      "https://albionoutpost.com/api/landing/craft?region=asia&batches=3",
    );
    expect(key("/api/landing/craft?region=europe&batches=51")).toBeNull();
    expect(key("/api/landing/craft?region=mars")).toBeNull();
    expect(key("/api/combat-events/top?region=americas")).toBe(
      "https://albionoutpost.com/api/combat-events/top?region=americas",
    );
    expect(key("/api/combat-events/top?region=europe&region=asia")).toBeNull();
  });
  it("keys the combined homepage answer by validated server only", () => {
    expect(key("/api/landing?region=europe")).toBe(
      "https://albionoutpost.com/api/landing?region=europe",
    );
    expect(key("/api/landing?utm=x&region=asia")).toBe(
      "https://albionoutpost.com/api/landing?region=asia",
    );
    expect(edgeCacheEntry(req("/api/landing?region=americas"))!.ttl).toBe(120);
    expect(key("/api/landing")).toBeNull();
    expect(key("/api/landing?region=mars")).toBeNull();
    expect(key("/api/landing?region=europe&region=asia")).toBeNull();
    const cookie = { headers: { Cookie: "next-auth.session-token=abc" } };
    expect(key("/api/landing?region=europe", cookie)).toBeNull();
  });
  it("never caches per-account likes", () => {
    expect(key("/api/library-likes?items=build:axe")).toBeNull();
    expect(key("/api/library-likes/build/axe")).toBeNull();
  });
  it("never caches signed-in visitors, writes or other routes", () => {
    const cookie = { headers: { Cookie: "__Secure-next-auth.session-token=abc" } };
    expect(key("/api/search?q=bag", cookie)).toBeNull();
    expect(key("/api/combat-events/top?region=europe", cookie)).toBeNull();
    expect(key("/api/search?q=bag", { method: "POST" })).toBeNull();
    expect(key("/api/market?region=europe&items=T4_BAG")).toBeNull();
    expect(key("/api/builds")).toBeNull();
  });
});
