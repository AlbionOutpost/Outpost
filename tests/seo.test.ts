import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  build: vi.fn(),
  composition: vi.fn(),
  item: vi.fn(),
  archiveBuild: vi.fn(),
  archiveComp: vi.fn(),
  archiveGuide: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/db", () => ({
  db: {
    build: { findFirst: mocks.build },
    composition: { findFirst: mocks.composition },
    itemMetadata: { findFirst: mocks.item },
  },
}));
vi.mock("../src/lib/grind-library", () => ({
  findLibraryBuild: mocks.archiveBuild,
  findLibraryComposition: mocks.archiveComp,
  findLibraryGuide: mocks.archiveGuide,
}));
import {
  canonicalUrl,
  metadataForPage,
  privateMetadata,
  publicOrigin,
  publicPages,
  rootMetadata,
} from "../src/lib/seo";
import {
  authoredShareMetadata,
  archiveShareMetadata,
  itemShareMetadata,
} from "../src/lib/seo-public";
import { readFileSync } from "node:fs";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OUTPOST_PUBLIC_URL", "https://albionoutpost.com");
  vi.stubEnv("GOOGLE_SITE_VERIFICATION", "");
  vi.stubEnv("BING_SITE_VERIFICATION", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("public metadata identity and social previews", () => {
  it("provides branded 1200x630 defaults without inventing verification", () => {
    const metadata = rootMetadata();
    expect(metadata.applicationName).toBe("Outpost");
    expect(metadata.metadataBase?.toString()).toBe("https://albionoutpost.com/");
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.openGraph).toMatchObject({
      siteName: "Outpost",
      images: [
        {
          url: "https://albionoutpost.com/brand/outpost-social.png",
          width: 1200,
          height: 630,
          type: "image/png",
        },
      ],
    });
    expect(metadata.verification).toBeUndefined();
    expect(metadata.alternates).toBeUndefined(); // No homepage canonical is inherited by other routes.
  });
  it("adds only explicitly configured public verification values", () => {
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "test-configured-google-verification");
    vi.stubEnv("BING_SITE_VERIFICATION", "test-configured-bing-verification");
    expect(rootMetadata().verification).toEqual({
      google: "test-configured-google-verification",
      other: { "msvalidate.01": "test-configured-bing-verification" },
    });
  });
  it.each([
    "http://localhost:3000",
    "not a URL",
    "https://secret:credential@albionoutpost.com",
    "http://albionoutpost.com",
  ])("does not publish an unsafe configuration origin: %s", (value) => {
    vi.stubEnv("OUTPOST_PUBLIC_URL", value);
    expect(publicOrigin()).toBe("https://albionoutpost.com");
  });
  it("names the Market itself: region, item, quality, tracking and private inputs are dropped", () => {
    const a = canonicalUrl("/tools/market", {
      region: "asia",
      item: "T4_MAIN_AXE@1",
      quality: "3",
      utm_source: "campaign",
      token: "PRIVATE_VALUE",
      city: "arbitrary",
    });
    const b = canonicalUrl("/tools/market", {
      region: "europe",
      item: "T4_MAIN_AXE@1",
      quality: "3",
    });
    expect(a).toBe("https://albionoutpost.com/tools/market");
    expect(a).toBe(b);
    expect(a).not.toContain("PRIVATE_VALUE");
  });
  it("rejects invalid identity and ambiguous repeated query values", () => {
    expect(
      canonicalUrl("/tools/market", {
        region: ["asia", "europe"],
        item: "<script>",
        quality: "99",
      }),
    ).toBe("https://albionoutpost.com/tools/market");
  });
  it.each([
    "https://evil.invalid/",
    "//evil.invalid/",
    "/tools?token=secret",
    "/tools#fragment",
    "/\\attacker.example/path",
    "/\n/attacker.example",
    "/tools\t/market",
    "/tools market",
  ])("rejects nonlocal/decorated canonical paths: %s", (path) =>
    expect(() => canonicalUrl(path)).toThrow(),
  );
  it("retains source, category and pagination identity and drops narrowing filters", () => {
    expect(
      canonicalUrl("/builds", {
        source: "library",
        category: "MISTS_SOLO",
        region: "americas",
        page: "2",
        weapon: "Battleaxe",
        family: "axe",
        tag: "solo",
        view: "list",
        sort: "recent",
        utm_campaign: "x",
      }),
    ).toBe("https://albionoutpost.com/builds?source=library&category=MISTS_SOLO&page=2");
    expect(canonicalUrl("/builds", { weapon: "Battleaxe" })).toBe(
      "https://albionoutpost.com/builds",
    );
    expect(metadataForPage("/builds", { category: "MISTS_SOLO" }).title).toBe(
      "Solo Mists builds — Albion Online",
    );
  });
  it.each(Object.keys(publicPages))(
    "has a distinct route canonical and complete share metadata for %s",
    (path) => {
      const metadata = metadataForPage(path, { region: "asia", utm_source: "x" });
      expect(metadata.alternates?.canonical).toBe(`https://albionoutpost.com${path}`);
      expect(metadata.description?.length).toBeGreaterThan(40);
      expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    },
  );
  it("opens /compositions on comps by activity and keeps the list a distinct page", () => {
    expect(metadataForPage("/compositions").title).toBe("Albion Online comps by activity");
    const list = metadataForPage("/compositions", { view: "all", region: "asia" });
    expect(list.title).toBe("Albion Online team compositions");
    expect(list.alternates?.canonical).toBe("https://albionoutpost.com/compositions?view=all");
    expect(metadataForPage("/compositions", { category: "ZVZ" }).title).toBe(
      "ZvZ comps — Albion Online",
    );
  });
  it.each([{ mine: "1" }, { view: "saved" }, { q: "not-public-search-text" }])(
    "keeps personalized/search variants out of indexing",
    (query) => {
      const metadata = metadataForPage("/builds", query);
      expect(metadata.robots).toMatchObject({ index: false, nosnippet: true });
      expect(JSON.stringify(metadata)).not.toContain("not-public-search-text");
    },
  );
  it("serves a real PNG with the declared dimensions", () => {
    const image = readFileSync("public/brand/outpost-social.png");
    expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
  });
});

describe("anonymous authored share metadata privacy", () => {
  const record = {
    id: "published-build",
    title: "Public Battleaxe",
    description: "Public equipment notes",
    contentType: "Solo Mists",
    visibility: "PUBLIC",
    hiddenAt: null,
  };
  it("queries only currently public, nonhidden builds without actor context", async () => {
    mocks.build.mockResolvedValue(record);
    const metadata = await authoredShareMetadata("build", record.id, { region: "asia" });
    expect(mocks.build).toHaveBeenCalledWith({
      where: { id: record.id, visibility: "PUBLIC", hiddenAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        contentType: true,
        visibility: true,
        hiddenAt: true,
      },
    });
    expect(metadata.title).toBe(record.title);
    expect(metadata.alternates?.canonical).toBe("https://albionoutpost.com/builds/published-build");
    expect(metadata.robots).toMatchObject({ index: true });
    expect(JSON.stringify(metadata)).not.toContain("authorId");
  });
  it.each(["PRIVATE", "UNLISTED", "GROUP", undefined])(
    "fails closed if an adapter returns restricted/unknown visibility %s",
    async (visibility) => {
      mocks.build.mockResolvedValue({
        ...record,
        visibility,
        title: "PRIVATE_TITLE",
        description: "PRIVATE_DESCRIPTION",
      });
      const metadata = await authoredShareMetadata("build", record.id);
      expect(metadata).toEqual(privateMetadata("Build"));
      expect(JSON.stringify(metadata)).not.toMatch(
        /PRIVATE_TITLE|PRIVATE_DESCRIPTION|published-build/,
      );
    },
  );
  it.each([new Date(), undefined])(
    "fails closed for hidden or incomplete visibility state",
    async (hiddenAt) => {
      mocks.build.mockResolvedValue({ ...record, hiddenAt, title: "HIDDEN_TITLE" });
      expect(await authoredShareMetadata("build", record.id)).toEqual(privateMetadata("Build"));
    },
  );
  it("returns the same generic metadata for missing/deleted and private records", async () => {
    mocks.build.mockResolvedValue(null);
    const missing = await authoredShareMetadata("build", "deleted-build");
    mocks.build.mockResolvedValue({ ...record, visibility: "PRIVATE", title: "DO_NOT_SHARE" });
    expect(await authoredShareMetadata("build", record.id)).toEqual(missing);
    expect(missing.robots).toMatchObject({
      index: false,
      follow: false,
      nosnippet: true,
      noimageindex: true,
    });
  });
  it("does not reuse a public metadata result after a visibility revocation", async () => {
    mocks.build.mockResolvedValueOnce(record).mockResolvedValueOnce(null);
    expect((await authoredShareMetadata("build", record.id)).title).toBe(record.title);
    expect(await authoredShareMetadata("build", record.id)).toEqual(privateMetadata("Build"));
    expect(mocks.build).toHaveBeenCalledTimes(2);
  });
  it("supports an explicitly public standalone composition", async () => {
    mocks.composition.mockResolvedValue({ ...record, id: "public-comp", groupId: null });
    expect((await authoredShareMetadata("composition", "public-comp")).title).toBe(record.title);
    expect(mocks.composition.mock.calls[0][0].where).toEqual({
      id: "public-comp",
      visibility: "PUBLIC",
      hiddenAt: null,
      groupId: null,
    });
  });
  it.each([
    { visibility: "GROUP", groupId: "secret-team" },
    { visibility: "PUBLIC", groupId: "secret-team" },
    { visibility: "PRIVATE", groupId: null },
    { visibility: "PUBLIC", groupId: undefined },
  ])("never shares Team-bound or private composition data", async (patch) => {
    mocks.composition.mockResolvedValue({
      ...record,
      ...patch,
      title: "TEAM_TITLE",
      description: "TEAM_NOTES",
    });
    const metadata = await authoredShareMetadata("composition", "private-comp");
    expect(metadata).toEqual(privateMetadata("Composition"));
    expect(JSON.stringify(metadata)).not.toMatch(/TEAM_TITLE|TEAM_NOTES|secret-team|private-comp/);
  });
});

describe("public archive and active catalog metadata", () => {
  const archived = {
    slug: "public-archive",
    title: "Archived build",
    author: "Dog",
    description: "<p>Recorded notes</p>",
    weaponName: "Battleaxe",
    category: "MISTS_SOLO",
    updatedAt: "2026-03-01",
    upvotes: 2,
    equipment: [
      { slot: "Main hand", itemId: "T8_MAIN_AXE" },
      { slot: "Helmet", itemId: "T8_HEAD_PLATE_SET1" },
      { slot: "Potion", itemId: "" },
    ],
  };
  it("uses only the public archive resolver for a recorded build", async () => {
    mocks.archiveBuild.mockResolvedValue(archived);
    const metadata = await archiveShareMetadata("build", "public-archive", { region: "europe" });
    expect(metadata.title).toBe("Archived build — Battleaxe build for Solo Mists");
    expect(metadata.description).toMatch(
      /^Battleaxe build for Solo Mists by Dog: [^,.]+\. Recorded notes$/,
    );
    expect(mocks.build).not.toHaveBeenCalled();
    expect(metadata.alternates?.canonical).toBe(
      "https://albionoutpost.com/builds/library/public-archive",
    );
    expect(metadata.robots).toMatchObject({ index: true });
  });
  it("keeps a build the library does not list out of the index, links still followed", async () => {
    mocks.archiveBuild.mockResolvedValue({ ...archived, title: "Battleaxe clap", upvotes: 0 });
    const metadata = await archiveShareMetadata("build", "public-archive");
    expect(metadata.title).toBe("Battleaxe clap");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBeNull();
  });
  it("does not fall back from missing archive entries to authored/private records", async () => {
    mocks.archiveBuild.mockResolvedValue(undefined);
    expect(await archiveShareMetadata("build", "private-record-id")).toEqual(
      privateMetadata("Build not found"),
    );
    expect(mocks.build).not.toHaveBeenCalled();
  });
  it("rejects inactive catalog data even if the adapter returns it", async () => {
    mocks.item.mockResolvedValue({ id: "T4_MAIN_AXE", name: "UNRELEASED_NAME", active: false });
    const metadata = await itemShareMetadata("T4_MAIN_AXE");
    expect(metadata).toEqual(privateMetadata("Item not found"));
    expect(JSON.stringify(metadata)).not.toContain("UNRELEASED_NAME");
  });
  it("rejects an unrelated active catalog DTO", async () => {
    mocks.item.mockResolvedValue({ id: "T8_MAIN_AXE", name: "Unrelated item", active: true });
    expect(await itemShareMetadata("T4_MAIN_AXE")).toEqual(privateMetadata("Item not found"));
  });
  it("retains item enchantment and region identity", async () => {
    mocks.item.mockResolvedValue({ id: "T4_MAIN_AXE@1", name: "Adept's Battleaxe", active: true });
    expect(
      (await itemShareMetadata("T4_MAIN_AXE%401", { region: "asia" })).alternates?.canonical,
    ).toBe("https://albionoutpost.com/items/T4_MAIN_AXE%401");
    expect(mocks.item.mock.calls[0][0].where).toEqual({ id: "T4_MAIN_AXE@1", active: true });
  });
});

describe("public discovery output", () => {
  it("generates only public sitemap paths, including escaped category identity", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { resolve, join } = await import("node:path");
    const { spawnSync } = await import("node:child_process");
    const directory = mkdtempSync(join(tmpdir(), "outpost-sitemap-test-"));
    try {
      mkdirSync(join(directory, "public/library"), { recursive: true });
      for (const kind of ["builds", "compositions", "guides"])
        writeFileSync(
          join(directory, `public/library/grind-${kind}.json`),
          JSON.stringify([
            {
              slug: `public-${kind}`,
              updatedAt: "2026-11-04T00:00:00Z",
              upvotes: 1,
              category: "MISTS_SOLO",
            },
            // Not listed by the library (no likes): its page is noindex, so it stays out.
            { slug: `unliked-${kind}`, updatedAt: "2026-11-04T00:00:00Z", category: "ZVZ" },
          ]),
        );
      const result = spawnSync(
        process.execPath,
        ["--import", import.meta.resolve("tsx"), resolve("scripts/build-sitemap.ts")],
        {
          cwd: directory,
          env: { NODE_ENV: "test", OUTPOST_PUBLIC_URL: "https://albionoutpost.com" },
          encoding: "utf8",
        },
      );
      expect(result.status, result.stderr).toBe(0);
      const xml = readFileSync(join(directory, "public/sitemap.xml"), "utf8");
      const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
        (entry) => new URL(entry[1].replaceAll("&amp;", "&")),
      );
      expect(urls.length).toBeGreaterThan(30);
      expect(new Set(urls.map(String)).size).toBe(urls.length);
      for (const url of urls) {
        expect(url.origin).toBe("https://albionoutpost.com");
        expect(url.hash).toBe("");
        expect(url.username + url.password).toBe("");
        expect(url.pathname).not.toMatch(
          /^\/(api|admin|dashboard|settings|favorites|shopping-list|timers|signin|groups|invitations|players|premium)(\/|$)/,
        );
        expect(url.pathname).not.toMatch(/^\/(builds|compositions)\/(new|[^/]+\/edit)(\/|$)/);
        expect(url.pathname).not.toBe("/tools/death-feed");
        for (const [key, value] of url.searchParams)
          expect(["source", "category", ...(value === "all" ? ["view"] : [])]).toContain(key);
      }
      expect(urls.some((url) => url.pathname === "/supporter")).toBe(false);
      // The Impressum, privacy policy and contact form are published and indexable.
      expect(urls.some((url) => url.pathname === "/legal")).toBe(true);
      expect(urls.some((url) => url.pathname === "/contact")).toBe(true);
      expect(urls.some((url) => url.searchParams.get("category") === "MISTS_SOLO")).toBe(true);
      expect(urls.some((url) => url.pathname === "/builds/library/public-builds")).toBe(true);
      expect(urls.some((url) => url.pathname === "/builds/library/unliked-builds")).toBe(false);
      // An activity without a listed build is an empty list.
      expect(urls.some((url) => url.searchParams.get("category") === "ZVZ")).toBe(false);
      expect(
        urls.some((url) => url.pathname === "/compositions/library/unliked-compositions"),
      ).toBe(true);
      // robots.txt is a static file too; nothing the sitemap lists may be disallowed in it.
      const robots = readFileSync(join(directory, "public/robots.txt"), "utf8");
      expect(robots).toContain("Sitemap: https://albionoutpost.com/sitemap.xml");
      expect(robots).toContain("Disallow: /builds/new");
      // The rules for every crawler (the first group; later groups name single bots).
      const blocked = [...robots.split("\n\n")[0].matchAll(/^Disallow: (.+)$/gm)].map(
        ([, rule]) =>
          new RegExp(
            `^${rule
              .replace(/[.+^${}()|[\]\\?]/g, "\\$&")
              .replaceAll("*", ".*")
              .replace(/\\\$$/, "$")}`,
          ),
      );
      const crawlable = (path: string) => !blocked.some((rule) => rule.test(path));
      for (const url of urls) expect(crawlable(url.pathname + url.search)).toBe(true);
      expect(crawlable("/builds?source=library&view=list")).toBe(false);
      expect(crawlable("/builds?q=sword")).toBe(false);
      expect(crawlable("/builds/library/public-builds?region=europe")).toBe(false);
      expect(crawlable("/items/T4_BAG?region=asia")).toBe(false);
      expect(crawlable("/compositions?view=all")).toBe(true);
      expect(crawlable("/builds/abc/edit")).toBe(false);
      expect(crawlable("/compositions/abc/edit?region=asia")).toBe(false);
      // A library slug that starts with "edit" is a public page, not an editor.
      expect(crawlable("/builds/library/edit-7-man-roads")).toBe(true);
      expect(robots).toMatch(/User-agent: AhrefsBot\n(User-agent: .+\n)*Disallow: \/\n/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it.each([true, false])(
    "forwards configured public verification bindings only (configured=%s)",
    async (configured) => {
      const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
      const { tmpdir } = await import("node:os");
      const { resolve, join } = await import("node:path");
      const { spawnSync } = await import("node:child_process");
      const directory = mkdtempSync(join(tmpdir(), "outpost-verification-test-"));
      try {
        mkdirSync(join(directory, "cloudflare/database"), { recursive: true });
        writeFileSync(join(directory, "wrangler.jsonc"), readFileSync("wrangler.jsonc"));
        writeFileSync(
          join(directory, "cloudflare/database/wrangler.jsonc"),
          readFileSync("cloudflare/database/wrangler.jsonc"),
        );
        const result = spawnSync(
          process.execPath,
          [resolve("scripts/cloudflare-release-config.mjs")],
          {
            cwd: directory,
            encoding: "utf8",
            env: {
              NODE_ENV: "test",
              CLOUDFLARE_CATALOG_DATABASE_ID: "11111111-1111-4111-8111-111111111111",
              NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0xFixturePublicKey",
              GOOGLE_SITE_VERIFICATION: configured ? "fixture-public-google-token" : "",
              BING_SITE_VERIFICATION: configured ? "ABC123456789" : "invalid value\nnot forwarded",
            },
          },
        );
        expect(result.status, result.stderr).toBe(0);
        const config = JSON.parse(
          readFileSync(join(directory, ".qa/cloudflare-release/web.jsonc"), "utf8"),
        );
        expect(config.vars.GOOGLE_SITE_VERIFICATION).toBe(
          configured ? "fixture-public-google-token" : undefined,
        );
        expect(config.vars.BING_SITE_VERIFICATION).toBe(configured ? "ABC123456789" : undefined);
        expect(result.stdout).not.toContain("fixture-public-google-token");
        expect(readFileSync(".github/workflows/cloudflare-preview.yml", "utf8")).toContain(
          "GOOGLE_SITE_VERIFICATION: ${{ vars.GOOGLE_SITE_VERIFICATION }}",
        );
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});
