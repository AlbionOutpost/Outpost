import { afterEach, expect, it, vi } from "vitest";
const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const variants = Array.from({ length: 25 }, (_, i) => ({
  id: `T${4 + Math.floor(i / 5)}_MAIN_AXE`,
  quality: 1 + (i % 5),
}));
function png(bytes = signature) {
  return new Response(bytes, { headers: { "content-type": "image/png" } });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("renders more than twenty distinct item variants with at most four source requests in flight", async () => {
  vi.resetModules();
  let active = 0,
    peak = 0;
  const fetch = vi.fn(async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    return png();
  });
  vi.stubGlobal("fetch", fetch);
  const { renderIcon } = await import("../src/lib/albion/icon-cache");
  const results = await Promise.all(variants.map(({ id, quality }) => renderIcon(id, quality)));
  expect(results.every((icon) => icon.available)).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(25);
  expect(peak).toBe(4);
  await renderIcon(variants[0].id, variants[0].quality);
  expect(fetch).toHaveBeenCalledTimes(25);
});
it("deduplicates pending work and retries queue overflow instead of poisoning the cache", async () => {
  vi.resetModules();
  let unlock!: () => void;
  const gate = new Promise<void>((resolve) => {
    unlock = resolve;
  });
  const fetch = vi.fn(async () => {
    await gate;
    return png();
  });
  vi.stubGlobal("fetch", fetch);
  const { renderIcon } = await import("../src/lib/albion/icon-cache");
  const pending = renderIcon("T4_MAIN_AXE", 1);
  const duplicate = renderIcon("T4_MAIN_AXE", 1);
  const others = Array.from({ length: 39 }, (_, i) =>
    renderIcon(`T4_MAIN_AXE@${1 + Math.floor(i / 10)}`, 1 + (i % 5)),
  );
  // Only unique keys reserve capacity; make the remaining requests distinct by tier/quality.
  const more = variants.map(({ id, quality }) => renderIcon(id, quality));
  expect(fetch).toHaveBeenCalledTimes(4);
  unlock();
  const results = await Promise.all([pending, duplicate, ...others, ...more]);
  expect(results[0]).toBe(results[1]);
  const refused = results.filter((icon) => !icon.available);
  expect(refused.length).toBeGreaterThan(0);
  expect(refused.every((icon) => icon.maxAge === 5)).toBe(true);
  expect((await renderIcon("T8_MAIN_AXE", 5)).available).toBe(true);
});
it("keeps a bounded minute budget and permits recovery when the window resets", async () => {
  vi.resetModules();
  let now = 100000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetch = vi.fn(async () => png());
  vi.stubGlobal("fetch", fetch);
  const { renderIcon } = await import("../src/lib/albion/icon-cache");
  // Valid renderer variants; these are mocked artwork, never a live source load test.
  for (let i = 0; i < 240; i++)
    expect(
      (
        await renderIcon(
          `T${1 + Math.floor(i / 35)}_MAIN_AXE${i % 7 ? `@${1 + (i % 4)}` : ""}`,
          1 + (Math.floor(i / 7) % 5),
        )
      ).available,
    ).toBe(true);
  // Repeated variant identities above can hit cache; exercise distinct item families below.
  for (const family of ["HEAD_PLATE_SET1", "ARMOR_PLATE_SET1", "SHOES_PLATE_SET1", "BAG", "CAPE"])
    for (const { id, quality } of variants)
      await renderIcon(id.replace("MAIN_AXE", family), quality);
  expect(fetch.mock.calls.length).toBeLessThanOrEqual(240);
  expect((await renderIcon("T8_2H_BOW@4", 5)).available).toBe(false);
  now += 60000;
  expect((await renderIcon("T8_2H_BOW@4", 5)).available).toBe(true);
});
it("rejects non-PNG or oversized source bodies and caches failures briefly", async () => {
  vi.resetModules();
  const bytes = new Uint8Array(200001);
  bytes.set(signature);
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("not a PNG", { headers: { "content-type": "image/png" } }))
    .mockResolvedValueOnce(png(bytes));
  vi.stubGlobal("fetch", fetch);
  const { renderIcon } = await import("../src/lib/albion/icon-cache");
  expect((await renderIcon("T4_BAG", 1)).maxAge).toBe(300);
  expect((await renderIcon("T4_CAPE", 1)).available).toBe(false);
  await renderIcon("T4_BAG", 1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
});
it("evicts artwork by byte budget rather than retaining hundreds of maximum-size images", async () => {
  vi.resetModules();
  const bytes = new Uint8Array(200000);
  bytes.set(signature);
  const fetch = vi.fn(async () => png(bytes));
  vi.stubGlobal("fetch", fetch);
  const { renderIcon } = await import("../src/lib/albion/icon-cache");
  for (const family of ["MAIN_AXE", "BAG"])
    for (const { id, quality } of variants)
      expect((await renderIcon(id.replace("MAIN_AXE", family), quality)).available).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(50);
  await renderIcon("T4_MAIN_AXE", 1);
  expect(fetch).toHaveBeenCalledTimes(51);
});
