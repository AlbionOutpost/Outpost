import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  gate: vi.fn(),
  change: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "member" } }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/giveaways/service", () => ({ changeGiveaway: m.change, giveawayBoard: vi.fn() }));
vi.mock("@/lib/billing/gate", async (actual) => ({
  ...(await actual<typeof import("@/lib/billing/gate")>()),
  requireTeamManagement: m.gate,
}));
const { POST } = await import("@/app/api/groups/[id]/giveaways/route");
const { HttpError } = await import("@/lib/http-error");

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost:3000/api/groups/g1/giveaways", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "g1" }) },
  );

beforeEach(() => {
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  m.gate.mockReset().mockResolvedValue(undefined);
  m.change.mockReset().mockResolvedValue({ board: { giveaways: [] } });
});

it("checks the owner's Supporter status before managing a Team giveaway", async () => {
  for (const action of ["create", "update", "cancel", "draw"]) {
    m.gate.mockClear();
    expect((await post({ action, id: "x" })).status).toBe(200);
    expect(m.gate).toHaveBeenCalledWith("g1", undefined, "member");
  }
});

it("refuses management with 402 on a lapsed team and changes nothing", async () => {
  m.gate.mockRejectedValue(
    new HttpError(402, "Team management needs the team's owner to be a Supporter."),
  );
  const response = await post({ action: "draw", id: "x" });
  expect(response.status).toBe(402);
  expect(m.change).not.toHaveBeenCalled();
});

it("keeps entering and leaving open to members", async () => {
  m.gate.mockRejectedValue(new HttpError(402, "locked"));
  for (const action of ["enter", "leave"])
    expect((await post({ action, id: "x" })).status).toBe(200);
  expect(m.gate).not.toHaveBeenCalled();
});
