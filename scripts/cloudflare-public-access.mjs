import { writeFileSync } from "node:fs";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";
const { accountId } = loadCloudflareCredentials();
const base = `/accounts/${accountId}/access/apps`,
  hosts = ["albionoutpost.com", "www.albionoutpost.com"];
const apps = (await api("GET", base)).result.filter((row) => hosts.includes(row.domain));
if (apps.some((app) => app.name !== `Outpost private preview (${app.domain})`))
  throw new Error("Unexpected Access application; refusing unrelated changes");
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({ ownerRequestedPublic: true, applicationsToRemove: apps.length, hosts }),
  );
  process.exit(0);
}
if (apps.length)
  writeFileSync(
    ".qa/cloudflare-launch/access-disabled-backup.json",
    JSON.stringify({ checkedAt: new Date().toISOString(), apps }, null, 2),
    { mode: 0o600 },
  );
for (const app of apps) await api("DELETE", `${base}/${app.id}`);
const remaining = (await api("GET", base)).result.filter((row) => hosts.includes(row.domain));
if (remaining.length) throw new Error("Public hostname still has an Access application");
const report = {
  checkedAt: new Date().toISOString(),
  publicAtOwnerRequest: true,
  hosts,
  accessRemovedFromPublicHosts: true,
  discordAuthorizationRetained: true,
  backendStillBindingOnly: true,
  unrelatedAccessApplicationsChanged: false,
  ownerDiscordId: "303585687460904970",
  ownerAssignmentDeployment: "IN PROGRESS",
  releaseReview: "NO-GO gates remain; owner explicitly requested public operation",
};
writeFileSync(".qa/cloudflare-launch/public-access.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
