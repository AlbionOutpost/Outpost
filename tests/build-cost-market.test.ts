import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn(), build: vi.fn(), session: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({ db: { build: { findUnique: mocks.build } } }));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(null);
  mocks.build.mockResolvedValue({
    id: "build",
    authorId: "owner",
    visibility: "PUBLIC",
    hiddenAt: null,
    equipment: [{ slot: "mainhand", itemId: "T4_MAIN_AXE", quality: 1 }],
  });
});
it("rejects an impossible Black Market purchase before requesting quotes", async () => {
  const { GET } = await import("../src/app/api/builds/[id]/cost/route");
  const response = await GET(
    new NextRequest(
      "http://localhost/api/builds/build/cost?region=europe&city=Black%20Market&sets=1",
    ),
    { params: Promise.resolve({ id: "build" }) },
  );
  expect(response.status).toBe(400);
  expect(mocks.prices).not.toHaveBeenCalled();
});
it("preserves private build denial before revealing market validation", async () => {
  mocks.build.mockResolvedValue({
    id: "build",
    authorId: "owner",
    visibility: "PRIVATE",
    hiddenAt: null,
    equipment: [],
  });
  const { GET } = await import("../src/app/api/builds/[id]/cost/route");
  const response = await GET(
    new NextRequest(
      "http://localhost/api/builds/build/cost?region=europe&city=Black%20Market&sets=1",
    ),
    { params: Promise.resolve({ id: "build" }) },
  );
  expect(response.status).toBe(404);
  expect(mocks.prices).not.toHaveBeenCalled();
});
