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
  it("shares the polled kill feed per server and page, never an answer the route would refuse", () => {
    expect(key("/api/combat-events?offset=20&region=asia")).toBe(
      "https://albionoutpost.com/api/combat-events?region=asia&offset=20",
    );
    expect(key("/api/combat-events?region=europe")).toBe(
      "https://albionoutpost.com/api/combat-events?region=europe&offset=0",
    );
    expect(edgeCacheEntry(req("/api/combat-events?region=europe&offset=0"))!.ttl).toBe(30);
    for (const bad of ["offset=10", "offset=220", "offset=020", "offset=-20", "offset=20&utm=x"])
      expect(key(`/api/combat-events?region=europe&${bad}`)).toBeNull();
    expect(key("/api/combat-events?region=mars&offset=0")).toBeNull();
    expect(
      key("/api/combat-events?region=europe&offset=0", {
        headers: { Cookie: "__Secure-next-auth.session-token=x" },
      }),
    ).toBeNull();
  });
  it("keys the scan routes by their validated selection only", () => {
    expect(
      key("/api/economy/crafts?utm=x&quality=2&region=europe&category=sword&tier=6&enchantment=1"),
    ).toBe(
      "https://albionoutpost.com/api/economy/crafts?region=europe&category=sword&tier=6&enchantment=1&quality=2",
    );
    expect(
      key("/api/economy/crafts?region=europe&category=mounts&tier=6&enchantment=0&quality=1"),
    ).toBeNull();
    expect(
      key("/api/economy/crafts?region=europe&category=sword&tier=9&enchantment=0&quality=1"),
    ).toBeNull();
    expect(
      key(
        "/api/economy/black-market?region=asia&category=bag&fromTier=4&toTier=8&enchantment=0&quality=1",
      ),
    ).toBe(
      "https://albionoutpost.com/api/economy/black-market?region=asia&category=bag&fromTier=4&toTier=8&enchantment=0&quality=1",
    );
    expect(
      key(
        "/api/economy/black-market?region=asia&category=bag&fromTier=8&toTier=4&enchantment=0&quality=1",
      ),
    ).toBeNull();
    expect(
      key(
        "/api/economy/black-market?region=asia&category=food&fromTier=4&toTier=8&enchantment=0&quality=1",
      ),
    ).toBeNull();
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
  it("keys Market Explorer's prices and history by their validated selection", () => {
    expect(key("/api/market?quality=2&utm=x&item=T4_BAG%401&region=europe")).toBe(
      "https://albionoutpost.com/api/market?region=europe&item=T4_BAG%401&quality=2",
    );
    expect(edgeCacheEntry(req("/api/market?region=asia&item=T4_BAG&quality=1"))!.ttl).toBe(60);
    expect(key("/api/market?region=europe&item=t4_bag&quality=1")).toBeNull();
    expect(key("/api/market?region=europe&item=T4_BAG&quality=6")).toBeNull();
    expect(key("/api/market?region=mars&item=T4_BAG&quality=1")).toBeNull();
    expect(
      key("/api/history?city=Fort%20Sterling&quality=1&item=T4_BAG&region=americas&kind=history"),
    ).toBe(
      "https://albionoutpost.com/api/history?kind=history&region=americas&item=T4_BAG&city=Fort%20Sterling&quality=1",
    );
    expect(edgeCacheEntry(req("/api/history?kind=gold&region=europe"))!.ttl).toBe(300);
    expect(key("/api/history?kind=gold&region=europe&item=T4_BAG")).toBe(
      "https://albionoutpost.com/api/history?kind=gold&region=europe",
    );
    expect(
      key("/api/history?kind=history&region=europe&item=T4_BAG&city=Nowhere&quality=1"),
    ).toBeNull();
    expect(key("/api/history?kind=other&region=europe")).toBeNull();
    const cookie = { headers: { Cookie: "next-auth.session-token=abc" } };
    expect(key("/api/market?region=europe&item=T4_BAG&quality=1", cookie)).toBeNull();
  });
  it("keys the item database's prices by server and the sorted page of items", () => {
    expect(key("/api/items/prices?items=T5_BAG,T4_BAG%401&region=europe&utm=x")).toBe(
      "https://albionoutpost.com/api/items/prices?region=europe&items=T4_BAG@1,T5_BAG",
    );
    expect(key("/api/items/prices?region=europe&items=T4_BAG%401,T5_BAG")).toBe(
      key("/api/items/prices?region=europe&items=T5_BAG,T4_BAG%401"),
    );
    expect(edgeCacheEntry(req("/api/items/prices?region=asia&items=T4_BAG"))!.ttl).toBe(120);
    const page = Array.from({ length: 30 }, (_, i) => `T4_TEST${i}`);
    expect(key(`/api/items/prices?region=europe&items=${page.join(",")}`)).not.toBeNull();
    expect(key(`/api/items/prices?region=europe&items=${[...page, "T4_X"].join(",")}`)).toBeNull();
    expect(key("/api/items/prices?region=europe&items=T4_BAG,T4_BAG")).toBeNull();
    expect(key("/api/items/prices?region=europe&items=t4_bag")).toBeNull();
    expect(key("/api/items/prices?region=europe&items=")).toBeNull();
    expect(key("/api/items/prices?region=mars&items=T4_BAG")).toBeNull();
    const cookie = { headers: { Cookie: "next-auth.session-token=abc" } };
    expect(key("/api/items/prices?region=europe&items=T4_BAG", cookie)).toBeNull();
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
