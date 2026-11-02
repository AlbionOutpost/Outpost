import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const prices = vi.hoisted(() => vi.fn(async () => []));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: prices }));
import { GET } from "../src/app/api/market/route";
import { isSupportedMarketItem } from "../src/lib/albion/market-supported";

describe("public market source identities", () => {
  it("rejects arbitrary syntactically valid IDs before any upstream client call", async () => {
    prices.mockClear();
    for (let i = 0; i < 49; i++) {
      const response = await GET(
        new NextRequest(
          `https://outpost.test/api/market?region=europe&quality=1&item=T4_AUDIT_NONEXISTENT_${i}`,
        ),
      );
      expect(response.status).toBe(400);
    }
    expect(prices).not.toHaveBeenCalled();
    expect(
      (
        await GET(
          new NextRequest("https://outpost.test/api/market?region=europe&quality=1&item=T4_BAG"),
        )
      ).status,
    ).toBe(200);
    expect(prices).toHaveBeenCalledOnce();
  });
  it("preserves recorded non-equipment and enchanted identities", () => {
    for (const id of ["T4_BAG@1", "UNIQUE_GVGTOKEN_GENERIC", "TREASURE_SILVERWARE_RARITY1"])
      expect(isSupportedMarketItem(id)).toBe(true);
    expect(isSupportedMarketItem("T4_UNRECORDED@4")).toBe(false);
  });
});
