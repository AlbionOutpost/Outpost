import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { cloudflareRequest, loadCloudflareCredentials } from "./cloudflare-client.mjs";

// Owner chose no sending/receiving on 28 October 2026. No invented reporting mailbox.
export const noMailRecords = [
  { type: "MX", name: "albionoutpost.com", content: ".", priority: 0, ttl: 3600 },
  { type: "TXT", name: "albionoutpost.com", content: "v=spf1 -all", ttl: 3600 },
  {
    type: "TXT",
    name: "_dmarc.albionoutpost.com",
    content: "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s",
    ttl: 3600,
  },
  { type: "TXT", name: "*._domainkey.albionoutpost.com", content: "v=DKIM1; p=", ttl: 3600 },
];
const text = (content) => content.replace(/^"|"$/g, "");
export function registrarDefaults(records) {
  // Only the exact imported registrar defaults may be retired under the no-mail decision.
  return records.filter(
    (r) =>
      r.name === "albionoutpost.com" &&
      ((r.type === "MX" && /^eforward[1-5]\.registrar-servers\.com\.?$/.test(r.content)) ||
        (r.type === "TXT" &&
          text(r.content) === "v=spf1 include:spf.efwd.registrar-servers.com ~all")),
  );
}
export function planMail(records) {
  return noMailRecords.map((desired) => {
    const matches = records.filter(
      (r) =>
        r.type === desired.type &&
        r.name === desired.name &&
        (desired.type !== "TXT" ||
          desired.name !== "albionoutpost.com" ||
          /^"?v=spf1\b/i.test(r.content)),
    );
    const exact = matches.find(
      (r) =>
        text(r.content) === desired.content &&
        (desired.priority === undefined || r.priority === desired.priority),
    );
    if (matches.length > 1 || matches.some((r) => r !== exact))
      throw Error(
        `Existing ${desired.type} mail policy at ${desired.name} conflicts. Preserve it until reviewed.`,
      );
    return { desired, status: exact ? "already-configured" : "create" };
  });
}

async function main() {
  const credentials = loadCloudflareCredentials({ dns: true });
  const api = (method, path, body) => cloudflareRequest(method, path, body, { credentials });
  const { zoneId } = credentials;
  const zone = (await api("GET", `/zones/${zoneId}`)).result;
  if (zone.name !== "albionoutpost.com" || zone.status !== "active")
    throw Error("Unexpected or inactive mail target.");
  const records = (await api("GET", `/zones/${zoneId}/dns_records?per_page=500`)).result;
  if (records.length >= 500)
    throw Error("DNS inventory requires pagination before applying mail changes.");
  const retired = process.argv.includes("--replace-registrar-defaults")
    ? registrarDefaults(records)
    : [];
  const plan = planMail(records.filter((r) => !retired.includes(r)));
  mkdirSync(".qa/cloudflare-launch", { recursive: true });
  if (process.argv.includes("--apply-no-mail")) {
    writeFileSync(
      `.qa/cloudflare-launch/mail-before-${Date.now()}.json`,
      JSON.stringify(
        {
          domain: zone.name,
          mailRecords: records.filter((r) => r.type === "MX" || r.type === "TXT"),
        },
        null,
        2,
      ),
      { mode: 0o600, flag: "wx" },
    );
    if (retired.length)
      await api("POST", `/zones/${zoneId}/dns_records/batch`, {
        deletes: retired.map((r) => ({ id: r.id })),
        posts: plan.filter((r) => r.status === "create").map((r) => r.desired),
      });
    else
      for (const row of plan)
        if (row.status === "create") await api("POST", `/zones/${zoneId}/dns_records`, row.desired);
    const current = (await api("GET", `/zones/${zoneId}/dns_records?per_page=500`)).result;
    if (planMail(current).some((r) => r.status !== "already-configured"))
      throw Error("Mail records were not confirmed by read-back.");
  }
  const report = {
    checkedAt: new Date().toISOString(),
    mode: process.argv.includes("--apply-no-mail") ? "applied-and-read-back" : "plan",
    domain: zone.name,
    ownerDecision: "No email yet; block domain spoofing",
    retiredRegistrarDefaults: retired.map((r) => ({ type: r.type, name: r.name })),
    plan,
    nameserversChanged: false,
    publicPropagationVerified: false,
  };
  writeFileSync(".qa/cloudflare-launch/mail-result.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
