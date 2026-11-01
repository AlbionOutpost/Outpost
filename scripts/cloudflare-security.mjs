import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { cloudflareRequest, loadCloudflareCredentials } from "./cloudflare-client.mjs";

export const securitySettings = {
  ssl: "strict",
  min_tls_version: "1.2",
  always_use_https: "on",
  tls_1_3: "on",
  browser_check: "on",
  automatic_https_rewrites: "on",
};
export const scannerRule = {
  ref: "outpost_block_sensitive_paths_v1",
  description: "Outpost: block configuration, repository and internal endpoint probes",
  action: "block",
  expression:
    '(http.host in {"albionoutpost.com" "www.albionoutpost.com"}) and (lower(http.request.uri.path) eq "/.env" or starts_with(lower(http.request.uri.path), "/.env.") or lower(http.request.uri.path) eq "/.git" or starts_with(lower(http.request.uri.path), "/.git/") or starts_with(lower(http.request.uri.path), "/api/internal/") or lower(http.request.uri.path) eq "/api/internal")',
  enabled: true,
};
export function containsExpected(actual, expected) {
  if (expected && typeof expected === "object")
    return (
      !!actual &&
      typeof actual === "object" &&
      Object.entries(expected).every(([key, value]) => containsExpected(actual[key], value))
    );
  return actual === expected;
}

/** Append an owned rule, preserving unrelated rules; refuse silent changes to an existing ref. */
export async function ensureRule(api, zoneId, phase, rule) {
  const base = `/zones/${zoneId}/rulesets`;
  let entry;
  try {
    entry = (await api("GET", `${base}/phases/${phase}/entrypoint`)).result;
  } catch (error) {
    if (!error.message.includes("HTTP 404")) throw error;
  }
  const existing = entry?.rules?.find((r) => r.ref === rule.ref);
  if (existing) {
    if (
      existing.action !== rule.action ||
      existing.expression !== rule.expression ||
      existing.enabled !== rule.enabled ||
      !containsExpected(existing.action_parameters || {}, rule.action_parameters || {})
    )
      throw Error(`Existing owned rule ${rule.ref} differs; review before replacing it.`);
    return { status: "already-configured", phase, ref: rule.ref };
  }
  if (entry) await api("POST", `${base}/${entry.id}/rules`, rule);
  else
    await api("POST", base, {
      name: `Outpost ${phase}`,
      kind: "zone",
      phase,
      rules: [rule],
    });
  const readback = (await api("GET", `${base}/phases/${phase}/entrypoint`)).result;
  if (!readback.rules?.some((r) => containsExpected(r, rule)))
    throw Error(`Rule ${rule.ref} was not confirmed by read-back.`);
  return { status: "applied-and-read-back", phase, ref: rule.ref };
}

async function main() {
  if (!process.argv.includes("--apply"))
    throw Error("Use --apply for the owner-authorized domain security setup.");
  const credentials = loadCloudflareCredentials({ dns: true });
  const { zoneId } = credentials;
  const api = (method, path, body) => cloudflareRequest(method, path, body, { credentials });
  const zone = (await api("GET", `/zones/${zoneId}`)).result;
  if (zone.name !== "albionoutpost.com" || zone.status !== "active")
    throw Error("Refusing to change a different or inactive zone.");
  const settings = (await api("GET", `/zones/${zoneId}/settings`)).result;
  const snapshot = {
    checkedAt: new Date().toISOString(),
    domain: zone.name,
    settings: settings.filter((r) => Object.hasOwn(securitySettings, r.id)),
  };
  mkdirSync(".qa/cloudflare-launch", { recursive: true });
  // Unique immutable rollback record for each run. No tokens or DNS contents are recorded.
  writeFileSync(
    `.qa/cloudflare-launch/security-before-${Date.now()}.json`,
    JSON.stringify(snapshot, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  const results = [];
  for (const [id, value] of Object.entries(securitySettings)) {
    try {
      const previous = settings.find((r) => r.id === id);
      if (previous?.value !== value)
        await api("PATCH", `/zones/${zoneId}/settings/${id}`, { value });
      const readback = (await api("GET", `/zones/${zoneId}/settings/${id}`)).result;
      if (readback.value !== value) throw Error("Setting did not match read-back.");
      results.push({
        setting: id,
        value,
        status: previous?.value === value ? "already-configured" : "applied-and-read-back",
      });
    } catch (error) {
      results.push({ setting: id, status: "BLOCKED", error: error.message });
    }
  }
  const available = (await api("GET", `/zones/${zoneId}/rulesets`)).result;
  const free = available.find(
    (r) => r.kind === "managed" && r.name === "Cloudflare Managed Free Ruleset",
  );
  const rules = [
    ["http_request_firewall_custom", scannerRule],
    ...(free
      ? [
          [
            "http_request_firewall_managed",
            {
              ref: "outpost_managed_free_v1",
              description: "Outpost Cloudflare Managed Free Ruleset",
              action: "execute",
              action_parameters: { id: free.id },
              expression: "true",
              enabled: true,
            },
          ],
        ]
      : []),
    [
      "http_request_cache_settings",
      {
        ref: "outpost_private_cache_bypass_v1",
        description: "Outpost: never edge-cache APIs or session-bearing requests",
        expression:
          '(starts_with(http.request.uri.path, "/api/") or http.cookie contains "next-auth.session-token=" or http.cookie contains "__Secure-next-auth.session-token=" or starts_with(http.request.uri.path, "/invitations/"))',
        action: "set_cache_settings",
        action_parameters: { cache: false },
        enabled: true,
      },
    ],
  ];
  for (const [phase, rule] of rules) {
    try {
      results.push(await ensureRule(api, zoneId, phase, rule));
    } catch (error) {
      results.push({ phase, status: "BLOCKED", error: error.message });
    }
  }
  if (!free)
    results.push({
      phase: "http_request_firewall_managed",
      status: "BLOCKED",
      error: "Free managed ruleset not returned by Cloudflare.",
    });
  const report = {
    checkedAt: new Date().toISOString(),
    domain: zone.name,
    results,
    deferred: [
      "DNS/mail/DNSSEC require verified DNS access and mail intent",
      "HSTS preload/includeSubDomains require working HTTPS and subdomain inventory",
      "Access needs an existing organization and an approved identity policy",
    ],
    billingChanges: false,
  };
  writeFileSync(
    ".qa/cloudflare-launch/security-result.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
