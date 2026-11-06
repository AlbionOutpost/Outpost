import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({
  db: {
    $transaction: mocks.transaction,
    libraryLike: { count: mocks.count, findMany: mocks.findMany },
  },
  databaseService: () => undefined,
}));
vi.mock("../src/lib/grind-library", () => ({
  findLibraryBuild: (slug: string) =>
    slug === "axe" || slug === "id-1" ? { slug: "axe", upvotes: 12 } : undefined,
  findLibraryComposition: (slug: string) =>
    slug === "front" ? { slug: "front", upvotes: 3 } : undefined,
}));

const get = async (items: string) => {
  const { GET } = await import("../src/app/api/library-likes/route");
  return GET(
    new NextRequest(`http://localhost/api/library-likes?${new URLSearchParams({ items })}`),
  );
};

describe("GET /api/library-likes (batched)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.count.mockImplementation((args) => ({ op: "count", args }));
    mocks.findMany.mockImplementation((args) => ({ op: "findMany", args }));
  });

  it("reads every chip in one database round trip and keys answers as asked", async () => {
    mocks.session.mockResolvedValue({ user: { id: "u1" } });
    mocks.transaction.mockResolvedValue([4, 0, [{ kind: "build", slug: "axe" }]]);
    const response = await get("build:axe,composition:front,build:missing");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    const [queries] = mocks.transaction.mock.calls[0];
    expect(queries).toHaveLength(3);
    // Only this account's likes are read; no other voter is returned.
    expect(mocks.findMany.mock.calls[0][0].where.userId).toEqual({ in: ["u1"] });
    expect(await response.json()).toEqual({
      signedIn: true,
      items: {
        "build:axe": { found: true, archivedCount: 12, outpostCount: 4, count: 16, liked: true },
        "composition:front": {
          found: true,
          archivedCount: 3,
          outpostCount: 0,
          count: 3,
          liked: false,
        },
        "build:missing": { found: false },
      },
    });
  });

  it("matches nobody's likes when signed out", async () => {
    mocks.session.mockResolvedValue(null);
    mocks.transaction.mockResolvedValue([1, []]);
    const body = await (await get("build:id-1")).json();
    expect(mocks.findMany.mock.calls[0][0].where.userId).toEqual({ in: [] });
    expect(mocks.count.mock.calls[0][0]).toEqual({ where: { kind: "build", slug: "axe" } });
    expect(body).toEqual({
      signedIn: false,
      items: {
        "build:id-1": { found: true, archivedCount: 12, outpostCount: 1, count: 13, liked: false },
      },
    });
  });

  it("rejects malformed, repeated or oversized lists without touching the database", async () => {
    for (const items of [
      "",
      "axe",
      "team:axe",
      "build:Bad Slug",
      "build:axe,build:axe",
      Array.from({ length: 11 }, (_, i) => `build:b${i}`).join(","),
    ]) {
      const response = await get(items);
      expect(response.status).toBe(400);
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
