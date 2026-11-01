import { describe, it, expect } from "vitest";
import { noMailRecords, planMail, registrarDefaults } from "../scripts/cloudflare-mail.mjs";
describe("owner-selected no-mail DNS policy", () => {
  it("retires only exact registrar defaults under the explicit no-email choice", () => {
    const imported = [
      { type: "MX", name: "albionoutpost.com", content: "eforward1.registrar-servers.com" },
      {
        type: "TXT",
        name: "albionoutpost.com",
        content: '"v=spf1 include:spf.efwd.registrar-servers.com ~all"',
      },
    ];
    const other = [
      { type: "MX", name: "albionoutpost.com", content: "mail.actual-provider.example" },
      { type: "TXT", name: "albionoutpost.com", content: "ownership-verification" },
      { type: "MX", name: "other.albionoutpost.com", content: "eforward1.registrar-servers.com" },
    ];
    expect(registrarDefaults([...imported, ...other])).toEqual(imported);
  });
  it("rejects mail and unauthenticated sending, including subdomains, without inventing a mailbox", () => {
    expect(noMailRecords[0]).toMatchObject({ type: "MX", content: ".", priority: 0 });
    expect(noMailRecords[1].content).toBe("v=spf1 -all");
    expect(noMailRecords[2].content).toContain("p=reject; sp=reject");
    expect(JSON.stringify(noMailRecords)).not.toContain("mailto:");
    expect(planMail([]).every((r) => r.status === "create")).toBe(true);
  });
  it("is idempotent with provider-quoted TXT and preserves unrelated ownership records", () => {
    const records = noMailRecords.map((r) => ({
      ...r,
      content: r.type === "TXT" ? `"${r.content}"` : r.content,
    }));
    expect(
      planMail([
        ...records,
        { type: "TXT", name: "albionoutpost.com", content: "ownership-proof" },
      ]).every((r) => r.status === "already-configured"),
    ).toBe(true);
  });
  it("refuses an existing mail provider, conflicting or duplicate SPF/DMARC policies", () => {
    for (const record of [
      { type: "MX", name: "albionoutpost.com", content: "mail.provider.example", priority: 10 },
      { type: "TXT", name: "albionoutpost.com", content: "v=spf1 include:provider.example ~all" },
      { type: "TXT", name: "_dmarc.albionoutpost.com", content: "v=DMARC1; p=none" },
    ])
      expect(() => planMail([record])).toThrow(/conflicts/);
    expect(() => planMail([...noMailRecords, noMailRecords[1]])).toThrow(/conflicts/);
  });
});
