import { lstatSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";

const { accountId } = loadCloudflareCredentials();
const privateFile = ".env.cloudflare-access";
const stat = lstatSync(privateFile);
if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077 || stat.size > 4096)
  throw new Error("Access identity must remain in an owner-only private configuration file");
const email = parseEnv(readFileSync(privateFile, "utf8")).OUTPOST_PREVIEW_ALLOWED_EMAIL;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error("Verified owner Access identity missing");
const base = `/accounts/${accountId}/access`;
const apply = process.argv.includes("--apply");
let idps = (await api("GET", `${base}/identity_providers`)).result;
let otp = idps.find(
  (row) => row.type === "onetimepin" && row.name === "Outpost owner one-time PIN",
);
if (!otp && apply)
  otp = (
    await api("POST", `${base}/identity_providers`, {
      name: "Outpost owner one-time PIN",
      type: "onetimepin",
      config: {},
    })
  ).result;
const policyName = "Outpost private preview owner";
let policies = (await api("GET", `${base}/policies`)).result;
let policy = policies.find((row) => row.name === policyName);
function checkPolicy(row) {
  if (
    row.decision !== "allow" ||
    row.include?.length !== 1 ||
    row.include[0]?.email?.email !== email ||
    row.exclude?.length ||
    row.require?.length
  )
    throw new Error(
      "Preview policy differs from the sole verified owner identity; refusing automatic changes",
    );
}
if (policy) checkPolicy(policy);
else if (apply)
  policy = (
    await api("POST", `${base}/policies`, {
      name: policyName,
      decision: "allow",
      include: [{ email: { email } }],
      exclude: [],
      require: [],
      session_duration: "4h",
    })
  ).result;
if (policy) checkPolicy(policy);
let apps = (await api("GET", `${base}/apps`)).result;
const report = [];
for (const domain of ["albionoutpost.com", "www.albionoutpost.com"]) {
  const name = `Outpost private preview (${domain})`;
  let app = apps.find((row) => row.domain === domain);
  if (app && app.name !== name)
    throw new Error("An unrelated Access application owns this hostname; refusing changes");
  if (!app && apply)
    app = (
      await api("POST", `${base}/apps`, {
        name,
        type: "self_hosted",
        domain,
        session_duration: "4h",
        allowed_idps: [otp.id],
        auto_redirect_to_identity: true,
        app_launcher_visible: false,
        allow_authenticate_via_warp: false,
        allow_iframe: false,
        http_only_cookie_attribute: true,
        same_site_cookie_attribute: "lax",
        options_preflight_bypass: false,
        policies: [{ id: policy.id, precedence: 1 }],
      })
    ).result;
  if (app) {
    const actual = (await api("GET", `${base}/apps/${app.id}`)).result;
    const actualPolicies = (await api("GET", `${base}/apps/${app.id}/policies`)).result;
    if (
      actual.domain !== domain ||
      actual.type !== "self_hosted" ||
      actual.allowed_idps?.length !== 1 ||
      actual.allowed_idps[0] !== otp?.id ||
      actualPolicies.length !== 1 ||
      actualPolicies[0].id !== policy?.id
    )
      throw new Error("Preview Access configuration did not match the exclusive owner policy");
    checkPolicy(actualPolicies[0]);
    report.push({
      domain,
      configured: true,
      ownerOnly: true,
      identityProvider: "one-time PIN",
      sessionDuration: actual.session_duration,
      noBypassPolicy: true,
    });
  } else report.push({ domain, configured: false });
}
const result = {
  checkedAt: new Date().toISOString(),
  applied: apply,
  applications: report,
  identityRecordedPrivately: true,
  publicRelease: false,
  paidSubscriptionChanged: false,
  applicationDeployed: false,
};
mkdirSync(".qa/cloudflare-launch", { recursive: true });
writeFileSync(".qa/cloudflare-launch/preview-access.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
