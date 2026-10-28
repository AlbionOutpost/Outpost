import { existsSync, lstatSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";
const path = ".env.cloudflare-runtime";
let previous = {};
if (existsSync(path)) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
    throw new Error("Runtime credentials must remain owner-only");
  previous = parseEnv(readFileSync(path, "utf8"));
}
const localStat = lstatSync(".env");
if (!localStat.isFile() || localStat.isSymbolicLink() || localStat.mode & 0o077)
  throw new Error("Local OAuth source credentials must remain owner-only");
const local = parseEnv(readFileSync(".env", "utf8"));
if (!local.DISCORD_CLIENT_ID || !local.DISCORD_CLIENT_SECRET)
  throw new Error("Configured Discord credential pair missing");
const { accountId } = loadCloudflareCredentials();
const target = JSON.parse(readFileSync(".qa/cloudflare-launch/d1-target.json", "utf8"));
const widget = JSON.parse(readFileSync(".qa/cloudflare-launch/turnstile-provision.json", "utf8"));
const actual = (await api("GET", `/accounts/${accountId}/challenges/widgets/${widget.sitekey}`))
  .result;
if (
  actual.name !== "albionoutpost-community" ||
  actual.sitekey !== widget.sitekey ||
  !actual.secret ||
  !actual.domains.includes("albionoutpost.com")
)
  throw new Error("Owned Turnstile widget verification failed");
const values = {
  OUTPOST_RENDER_SESSION_SECRET:
    previous.OUTPOST_RENDER_SESSION_SECRET || randomBytes(48).toString("hex"),
  NEXTAUTH_SECRET: previous.NEXTAUTH_SECRET || randomBytes(48).toString("hex"),
  DISCORD_CLIENT_ID: local.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: local.DISCORD_CLIENT_SECRET,
  NEXTAUTH_URL: "https://albionoutpost.com",
  TURNSTILE_SECRET: actual.secret,
  TURNSTILE_HOSTNAMES: "albionoutpost.com,www.albionoutpost.com",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: actual.sitekey,
  CLOUDFLARE_CATALOG_DATABASE_ID: target.databaseId,
};
if (Object.values(values).some((value) => typeof value !== "string" || /[\r\n]/.test(value)))
  throw new Error("Malformed runtime configuration");
writeFileSync(
  path,
  Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
chmodSync(path, 0o600);
console.log(
  JSON.stringify({
    prepared: true,
    ownerOnly: true,
    nextAuthSecretRetained: Boolean(previous.NEXTAUTH_SECRET),
    discordPairConfigured: true,
    turnstileConfigured: true,
    administrativeCredentialsIncluded: false,
    uploaded: false,
  }),
);
