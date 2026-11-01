import { afterEach, describe, expect, it, vi } from "vitest";
import { renderIcon } from "@/lib/albion/icon-cache";

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
function pngResponse() {
  return new Response(PNG, {
    status: 200,
    headers: { "content-type": "image/png", "content-length": String(PNG.length) },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("icon enchant fallback", () => {
  it("serves the base-tier art when the enchanted id 404s", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        seen.push(url);
        return /@\d/.test(decodeURIComponent(url))
          ? new Response("", { status: 404 })
          : pngResponse();
      }),
    );
    const icon = await renderIcon("T8_ARMOR_PLATE_AVALON_FALLBACKTEST@4", 1);
    expect(icon.available).toBe(true);
    expect(icon.type).toBe("image/png");
    // tried the enchanted id first, then the base id
    expect(seen.some((u) => /@4/.test(decodeURIComponent(u)))).toBe(true);
    expect(seen.some((u) => /AVALON_FALLBACKTEST\.png/.test(u))).toBe(true);
  });

  it("returns the neutral placeholder when neither enchanted nor base art exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    const icon = await renderIcon("T8_ARMOR_NOART_FALLBACKTEST@4", 1);
    expect(icon.available).toBe(false);
    expect(icon.type).toBe("image/svg+xml");
  });
});
