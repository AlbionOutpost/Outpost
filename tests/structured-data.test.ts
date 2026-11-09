import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  articleLd,
  breadcrumbList,
  crumbsForPath,
  itemListLd,
  siteGraph,
} from "@/lib/structured-data";

describe("structured data", () => {
  it("describes the organization and website with absolute same-origin URLs", () => {
    const graph = (siteGraph() as { "@graph": Record<string, unknown>[] })["@graph"];
    expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite"]);
    expect(graph[0].logo).toBe("https://albionoutpost.com/icon-512.png");
    expect(JSON.stringify(graph)).not.toContain("SearchAction");
  });

  it("builds ordered breadcrumbs only for reviewed nested public routes", () => {
    expect(crumbsForPath("/")).toBeNull();
    expect(crumbsForPath("/guides")).toBeNull();
    expect(crumbsForPath("/dashboard/anything")).toBeNull();
    const crumbs = crumbsForPath("/tools/market")!;
    expect(crumbs.map((crumb) => crumb.name)).toEqual(["Home", "Tools", "Market prices"]);
    const list = breadcrumbList(crumbs) as {
      itemListElement: { position: number; item: string }[];
    };
    expect(list.itemListElement.map((entry) => entry.position)).toEqual([1, 2, 3]);
    expect(list.itemListElement[2].item).toBe("https://albionoutpost.com/tools/market");
  });

  it("emits Article and ItemList shapes with valid dates and counts", () => {
    const article = articleLd({
      title: "Fishing guide",
      description: "Levelling",
      path: "/guides/fishing",
      author: "Someone",
      updatedAt: "not a date",
    });
    expect(article["@type"]).toBe("Article");
    expect(article).not.toHaveProperty("dateModified");
    expect(
      articleLd({ title: "t", description: "d", path: "/g", author: "a", updatedAt: "2025-01-02" }),
    ).toHaveProperty("dateModified", "2025-01-02");
    const list = itemListLd("Guides", [{ name: "A", path: "/guides/a" }]) as {
      numberOfItems: number;
    };
    expect(list.numberOfItems).toBe(1);
  });

  it("ships the manifest icons and an optimised 1200x630 social image", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    expect(manifest.start_url).toBe("/");
    for (const icon of ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]) {
      expect(readFileSync(`public/${icon}`).subarray(1, 4).toString()).toBe("PNG");
      expect(manifest.icons.map((entry: { src: string }) => entry.src)).toContain(`/${icon}`);
    }
    const social = readFileSync("public/brand/outpost-social.png");
    expect(social.readUInt32BE(16)).toBe(1200);
    expect(social.readUInt32BE(20)).toBe(630);
    expect(social.length).toBeLessThan(450_000);
  });
});
