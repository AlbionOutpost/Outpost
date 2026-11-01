import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";
const credentials = loadCloudflareCredentials(),
  dns = loadCloudflareCredentials({ dns: true });
const { accountId, zoneId } = credentials;
const owner = parseEnv(
  readFileSync(".env.cloudflare-access", "utf8"),
).OUTPOST_PREVIEW_ALLOWED_EMAIL;
const verification = parseEnv(readFileSync(".env.cloudflare-preview", "utf8"));
const hosts = ["albionoutpost.com", "www.albionoutpost.com"],
  service = "albionoutpost-web";
const apps = (await api("GET", `/accounts/${accountId}/access/apps`)).result;
for (const host of hosts) {
  const app = apps.find(
    (row) => row.domain === host && row.name === `Outpost private preview (${host})`,
  );
  if (!app) throw new Error("Private preview Access application missing");
  const policies = (await api("GET", `/accounts/${accountId}/access/apps/${app.id}/policies`))
    .result;
  if (
    policies.length < 1 ||
    policies.length > 2 ||
    policies.some(
      (row) =>
        row.exclude?.length ||
        row.require?.length ||
        row.include?.length !== 1 ||
        !(
          (row.decision === "allow" && row.include[0]?.email?.email === owner) ||
          (row.decision === "non_identity" &&
            row.include[0]?.service_token?.token_id === verification.OUTPOST_PREVIEW_TOKEN_ID)
        ),
    )
  )
    throw new Error(
      "Hostname is not restricted to the owner and temporary verification credential",
    );
}
const domains = (await api("GET", `/accounts/${accountId}/workers/domains`)).result;
const records = (
  await api("GET", `/zones/${zoneId}/dns_records?per_page=100`, undefined, { credentials: dns })
).result;
if (!Array.isArray(records) || records.length >= 100)
  throw new Error("Unexpected DNS inventory; refuse incomplete selection");
const selected = records.filter(
  (row) => hosts.includes(row.name) && ["A", "AAAA", "CNAME"].includes(row.type),
);
for (const row of selected) {
  const known =
    (row.name === "albionoutpost.com" && row.type === "A" && row.content === "162.255.119.108") ||
    (row.name === "www.albionoutpost.com" &&
      row.type === "CNAME" &&
      row.content.replace(/\.$/, "") === "parkingpage.namecheap.com");
  if (
    !known &&
    !domains.some((domain) => domain.hostname === row.name && domain.service === service)
  )
    throw new Error("Unexpected origin record; refusing replacement");
}
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      ready: true,
      protectedHosts: hosts,
      parkingRecordsToReplace: selected.length,
    }),
  );
  process.exit(0);
}
writeFileSync(
  ".qa/cloudflare-launch/application-dns-before.json",
  JSON.stringify({ checkedAt: new Date().toISOString(), records: selected }, null, 2),
  { mode: 0o600 },
);
for (const hostname of hosts) {
  const existing = domains.find((domain) => domain.hostname === hostname);
  if (existing) {
    if (existing.service !== service)
      throw new Error("Hostname belongs to another Worker; refusing replacement");
    continue;
  }
  const previous = selected.filter((record) => record.name === hostname);
  for (const row of previous)
    await api("DELETE", `/zones/${zoneId}/dns_records/${row.id}`, undefined, { credentials: dns });
  try {
    await api("PUT", `/accounts/${accountId}/workers/domains`, {
      hostname,
      service,
      environment: "production",
      zone_id: zoneId,
      enabled: true,
      previews_enabled: false,
    });
  } catch (error) {
    for (const row of previous)
      await api(
        "POST",
        `/zones/${zoneId}/dns_records`,
        {
          name: row.name,
          type: row.type,
          content: row.content,
          ttl: row.ttl,
          proxied: row.proxied,
        },
        { credentials: dns },
      );
    throw error;
  }
}
const actual = (await api("GET", `/accounts/${accountId}/workers/domains`)).result.filter(
  (domain) => hosts.includes(domain.hostname),
);
if (
  actual.length !== 2 ||
  actual.some(
    (domain) =>
      domain.service !== service || domain.previews_enabled === true || domain.enabled === false,
  )
)
  throw new Error("Domain attachment read-back failed");
const report = {
  checkedAt: new Date().toISOString(),
  privatePreviewAttached: true,
  hosts,
  service,
  workersDevEnabled: false,
  versionPreviewsEnabled: false,
  ownerAccessRequired: true,
  temporaryVerificationPrincipal: true,
  publicRelease: false,
  unrelatedDnsChanged: false,
};
writeFileSync(".qa/cloudflare-launch/domain-attachment.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
