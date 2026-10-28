import { lstatSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { cloudflareRequest as api, loadCloudflareCredentials } from "./cloudflare-client.mjs";
const repository = "AlbionOutpost/Outpost",
  environment = "cloudflare-production";
const { accountId } = loadCloudflareCredentials();
function gh(args, input) {
  const result = spawnSync("gh", args, { input, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0)
    throw new Error("GitHub configuration failed; credentials and raw responses withheld");
  return result.stdout;
}
const repo = JSON.parse(gh(["api", `repos/${repository}`]));
if (!repo.private || !repo.permissions?.admin)
  throw new Error("Preview deployment requires the owned private repository");
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      repository,
      environment,
      private: true,
      changes: false,
      ciPermission: "Account Workers Scripts Write only",
    }),
  );
  process.exit(0);
}
const file = ".env.cloudflare-ci";
let deployToken, expiresOn;
if (existsSync(file)) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
    throw new Error("CI credentials must remain owner-only");
  const stored = parseEnv(readFileSync(file, "utf8"));
  deployToken = stored.CLOUDFLARE_DEPLOY_API_TOKEN;
  expiresOn = stored.OUTPOST_CI_TOKEN_EXPIRES;
} else {
  const groups = (await api("GET", `/accounts/${accountId}/tokens/permission_groups`)).result;
  const scripts = groups.find((row) => row.name === "Workers Scripts Write");
  if (!scripts) throw new Error("Workers deployment permission unavailable");
  expiresOn = new Date(Date.now() + 90 * 86400_000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const token = (
    await api("POST", `/accounts/${accountId}/tokens`, {
      name: "Outpost GitHub private preview deployment",
      expires_on: expiresOn,
      policies: [
        {
          effect: "allow",
          permission_groups: [{ id: scripts.id }],
          resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
        },
      ],
    })
  ).result;
  if (!token?.value) throw new Error("Cloudflare did not return a deploy token");
  deployToken = token.value;
  writeFileSync(
    file,
    `CLOUDFLARE_DEPLOY_API_TOKEN=${deployToken}\nOUTPOST_CI_TOKEN_EXPIRES=${expiresOn}\n`,
    { mode: 0o600 },
  );
  chmodSync(file, 0o600);
}
if (!deployToken || !/^cfat_[A-Za-z0-9_-]+$/.test(deployToken))
  throw new Error("Deploy token is missing or malformed");
const credentials = { ...loadCloudflareCredentials(), token: deployToken };
const verified = (
  await api("GET", `/accounts/${accountId}/tokens/verify`, undefined, { credentials })
).result;
if (verified.status !== "active") throw new Error("Deploy token is not active");
await api("GET", `/accounts/${accountId}/workers/scripts`, undefined, { credentials });
const environments = JSON.parse(gh(["api", `repos/${repository}/environments`])).environments;
let existing = environments.find((row) => row.name === environment);
if (!existing)
  existing = JSON.parse(
    gh(
      ["api", "--method", "PUT", `repos/${repository}/environments/${environment}`, "--input", "-"],
      JSON.stringify({
        deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
      }),
    ),
  );
if (!existing.deployment_branch_policy?.custom_branch_policies)
  throw new Error(
    "Preview environment must restrict deployment refs; preserve existing settings and review",
  );
const branchPath = `repos/${repository}/environments/${environment}/deployment-branch-policies`;
const branchPolicies = JSON.parse(gh(["api", branchPath])).branch_policies;
for (const [name, type] of [
  ["main", "branch"],
  ["codex/cloudflare-free-launch", "branch"],
  ["v*", "tag"],
])
  if (!branchPolicies.some((row) => row.name === name && row.type === type))
    gh(["api", "--method", "POST", branchPath, "--input", "-"], JSON.stringify({ name, type }));
gh(
  ["secret", "set", "CLOUDFLARE_API_TOKEN", "--env", environment, "--repo", repository],
  deployToken,
);
const target = JSON.parse(readFileSync(".qa/cloudflare-launch/d1-target.json", "utf8"));
const turnstile = JSON.parse(
  readFileSync(".qa/cloudflare-launch/turnstile-provision.json", "utf8"),
);
for (const [name, value] of Object.entries({
  CLOUDFLARE_ACCOUNT_ID: accountId,
  CLOUDFLARE_CATALOG_DATABASE_ID: target.databaseId,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstile.sitekey,
}))
  gh(["variable", "set", name, "--env", environment, "--repo", repository], value);
const report = {
  checkedAt: new Date().toISOString(),
  repository,
  environment,
  credentialStoredInGitHubEnvironment: true,
  permission: "Account Workers Scripts Write only",
  expiresOn,
  permittedRefs: ["main", "codex/cloudflare-free-launch", "v*"],
  adminTokenUploaded: false,
  runtimeOAuthSecretsUploadedToGitHub: false,
  workflowConnected: false,
  automaticDeploymentVerified: false,
};
writeFileSync(".qa/cloudflare-launch/github-deploy-setup.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
