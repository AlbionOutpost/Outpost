import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { cloudflareRequest, loadCloudflareCredentials } from "./cloudflare-client.mjs";

export function normalizeDs(value) {
  if (typeof value !== "string") return "";
  const data = value
    .replace(/^.*\sDS\s+/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  return /^\d+ \d+ \d+ [A-F0-9]+$/.test(data) ? data : "";
}

async function main() {
  const credentials = loadCloudflareCredentials({ dns: true });
  const api = (method, path, body) => cloudflareRequest(method, path, body, { credentials });
  const zone = (await api("GET", `/zones/${credentials.zoneId}`)).result;
  if (zone.name !== "albionoutpost.com" || zone.status !== "active")
    throw Error("Unexpected DNSSEC target.");
  const path = `/zones/${credentials.zoneId}/dnssec`;
  let current = (await api("GET", path)).result;
  const response = await fetch(
    "https://cloudflare-dns.com/dns-query?name=albionoutpost.com&type=DS&do=true",
    {
      headers: { Accept: "application/dns-json" },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw Error("Public DS check unavailable; no signing change made.");
  const dns = await response.json();
  if (dns.Status !== 0)
    throw Error("Public DS lookup failed; review the chain before changing signing.");
  const ds = (dns.Answer || []).filter((r) => r.type === 43).map((r) => normalizeDs(r.data));
  if (ds.length && (!current.ds || !ds.includes(normalizeDs(current.ds))))
    throw Error("Existing registrar DS differs; review migration before changing signing.");
  mkdirSync(".qa/cloudflare-launch", { recursive: true });
  if (process.argv.includes("--enable") && current.status === "disabled") {
    writeFileSync(
      `.qa/cloudflare-launch/dnssec-before-${Date.now()}.json`,
      JSON.stringify({ status: current.status, publicDs: ds }, null, 2),
      { mode: 0o600, flag: "wx" },
    );
    await api("PATCH", path, { status: "active" });
    current = (await api("GET", path)).result;
  }
  const report = {
    checkedAt: new Date().toISOString(),
    domain: zone.name,
    cloudflareSigning: current.status,
    ds: current.ds,
    publicDs: ds,
    registrarChainStatus: ds.includes(normalizeDs(current.ds))
      ? "DS_PRESENT_REQUIRES_VALIDATING_RESOLVER_CHECK"
      : "PENDING_REGISTRAR_DS",
    scope:
      "Cloudflare signing read-back and public DS lookup; no registrar changes or complete chain certification",
    nameserversChanged: false,
  };
  writeFileSync(".qa/cloudflare-launch/dnssec-result.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
