import { existsSync, lstatSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { parseEnv } from "node:util";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";
const { accountId } = loadCloudflareCredentials(),
  base = `/accounts/${accountId}/access`;
const file = ".env.cloudflare-preview";
const serviceName = "Outpost temporary deployment verification",
  policyName = "Outpost temporary deployment verification";
const hosts = ["albionoutpost.com", "www.albionoutpost.com"];
const fields = [
  "name",
  "type",
  "domain",
  "session_duration",
  "allowed_idps",
  "auto_redirect_to_identity",
  "app_launcher_visible",
  "allow_authenticate_via_warp",
  "allow_iframe",
  "http_only_cookie_attribute",
  "same_site_cookie_attribute",
  "options_preflight_bypass",
];
let stored;
if (existsSync(file)) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
    throw new Error("Preview service credentials must remain owner-only");
  stored = parseEnv(readFileSync(file, "utf8"));
}
const cleanup = process.argv.includes("--cleanup");
if (!cleanup && stored)
  throw new Error(
    "Existing temporary verification credentials require cleanup before creating another token",
  );
const apps = (await api("GET", `${base}/apps`)).result.filter((app) => hosts.includes(app.domain));
if (apps.length !== 2 || apps.some((app) => app.name !== `Outpost private preview (${app.domain})`))
  throw new Error("Expected owned preview Access applications missing");
let token, policy;
if (cleanup) {
  if (!stored) {
    console.log(JSON.stringify({ cleanup: "nothing configured" }));
    process.exit(0);
  }
  token = { id: stored.OUTPOST_PREVIEW_TOKEN_ID };
  policy = { id: stored.OUTPOST_PREVIEW_POLICY_ID };
} else {
  token = (await api("POST", `${base}/service_tokens`, { name: serviceName, duration: "1h" }))
    .result;
  if (!token?.client_id || !token.client_secret)
    throw new Error("Temporary verification credential creation failed");
  stored = {
    CF_ACCESS_CLIENT_ID: token.client_id,
    CF_ACCESS_CLIENT_SECRET: token.client_secret,
    OUTPOST_PREVIEW_TOKEN_ID: token.id,
    OUTPOST_PREVIEW_TOKEN_EXPIRES: token.expires_at,
  };
  // Persist the newly issued secret immediately, including if a later policy operation fails.
  writeFileSync(
    file,
    Object.entries(stored)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  chmodSync(file, 0o600);
  policy = (
    await api("POST", `${base}/policies`, {
      name: policyName,
      decision: "non_identity",
      include: [{ service_token: { token_id: token.id } }],
      require: [],
      exclude: [],
    })
  ).result;
  stored.OUTPOST_PREVIEW_POLICY_ID = policy.id;
  writeFileSync(
    file,
    Object.entries(stored)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
}
for (const app of apps) {
  const policies = (await api("GET", `${base}/apps/${app.id}/policies`)).result;
  const keep = policies
    .filter((row) => row.id !== policy.id)
    .map((row, i) => ({ id: row.id, precedence: i + 2 }));
  if (!cleanup) keep.unshift({ id: policy.id, precedence: 1 });
  const body = Object.fromEntries(
    fields.filter((field) => app[field] !== undefined).map((field) => [field, app[field]]),
  );
  await api("PUT", `${base}/apps/${app.id}`, { ...body, policies: keep });
}
if (cleanup) {
  if (policy.id) {
    const actual = (await api("GET", `${base}/policies/${policy.id}`)).result;
    if (actual.name !== policyName || actual.decision !== "non_identity")
      throw new Error("Unrecognized temporary policy; refusing deletion");
    await api("DELETE", `${base}/policies/${policy.id}`);
  }
  const actual = (await api("GET", `${base}/service_tokens`)).result.find(
    (row) => row.id === token.id,
  );
  if (actual && actual.name !== serviceName)
    throw new Error("Unrecognized service token; refusing deletion");
  if (actual) await api("DELETE", `${base}/service_tokens/${token.id}`);
  // Retain a private revocation record but remove usable secret material.
  writeFileSync(file, "OUTPOST_PREVIEW_SERVICE_REVOKED=true\n", { mode: 0o600 });
}
console.log(
  JSON.stringify({
    temporaryServiceAccess: !cleanup,
    duration: cleanup ? undefined : "1h",
    hosts,
    revoked: cleanup,
    runtimeDiscordAuthorizationUnchanged: true,
    noPublicBypass: true,
  }),
);
