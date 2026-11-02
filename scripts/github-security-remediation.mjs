import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { branchPolicy, ghApi } from "./github-setup.mjs";

const repository = "AlbionOutpost/Outpost";
const base = `repos/${repository}`;
// GitHub may add documented default fields. Compare every chosen control and all
// array members, while allowing additional provider defaults inside objects.
export function matchesPolicy(actual, expected) {
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((value) => actual.some((candidate) => matchesPolicy(candidate, value)))
    );
  if (expected && typeof expected === "object")
    return (
      !!actual &&
      typeof actual === "object" &&
      Object.entries(expected).every(([key, value]) => matchesPolicy(actual[key], value))
    );
  return actual === expected;
}
async function repositoryRules(api) {
  const rules = [];
  for (let page = 1; page <= 20; page++) {
    const rows = await api(
      "GET",
      `${base}/rulesets?includes_parents=false&per_page=100&page=${page}`,
    );
    if (!Array.isArray(rows)) throw new Error("Invalid ruleset list");
    rules.push(...rows);
    if (rows.length < 100) return rules;
  }
  throw new Error("Ruleset inventory exceeds the reviewed bound");
}
/** @param {(before: unknown) => void} [snapshot] */
export async function remediateRepository(api, apply = false, snapshot = () => {}) {
  const before = await api("GET", base);
  if (before.full_name?.toLowerCase() !== repository.toLowerCase())
    throw new Error("Refusing to change another repository");
  const rulesets = await repositoryRules(api);
  const desired = { ...branchPolicy("outpost"), name: "Outpost security quality gates" };
  const owned = rulesets.find((r) => r.name === desired.name);
  if (owned) {
    const actual = await api("GET", `${base}/rulesets/${owned.id}`);
    for (const key of ["target", "enforcement", "conditions", "rules", "bypass_actors"])
      if (!matchesPolicy(actual[key], desired[key]))
        throw new Error("Existing security rules differ; refusing to weaken or replace them");
  }
  const plan = {
    repository,
    ruleset: desired,
    enableSecretPushProtection:
      before.security_and_analysis?.secret_scanning_push_protection?.status !== "enabled",
  };
  if (!apply) return { mode: "read-only", plan };
  snapshot({
    repository,
    rulesets,
    secretPushProtection: before.security_and_analysis?.secret_scanning_push_protection,
  });
  if (!owned) await api("POST", `${base}/rulesets`, desired);
  const saved = (await repositoryRules(api)).find((r) => r.name === desired.name);
  if (!saved) throw new Error("Required-check ruleset was not saved");
  const actual = await api("GET", `${base}/rulesets/${saved.id}`);
  for (const key of ["target", "enforcement", "conditions", "rules", "bypass_actors"])
    if (!matchesPolicy(actual[key], desired[key]))
      throw new Error("Ruleset readback did not match");
  let secretPushProtection = "verified";
  try {
    if (plan.enableSecretPushProtection)
      await api("PATCH", base, {
        security_and_analysis: { secret_scanning_push_protection: { status: "enabled" } },
      });
    const readback = await api("GET", base);
    if (readback.security_and_analysis?.secret_scanning_push_protection?.status !== "enabled")
      throw new Error("Secret push protection was not confirmed");
  } catch (error) {
    secretPushProtection = `BLOCKED: ${error.status ? `HTTP ${error.status}` : "readback failed"}`;
  }
  return {
    mode: "applied-and-read-back",
    repository,
    requiredChecks: ["checks", "browser"],
    ruleset: "verified",
    secretPushProtection,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).some((a) => a !== "--apply"))
    throw new Error("Usage: github-security-remediation.mjs [--apply]");
  const folder = ".qa/security-remediation";
  mkdirSync(folder, { recursive: true });
  remediateRepository(ghApi, process.argv.includes("--apply"), (before) =>
    writeFileSync(`${folder}/github-before-${Date.now()}.json`, JSON.stringify(before, null, 2), {
      flag: "wx",
      mode: 0o600,
    }),
  )
    .then((result) => {
      writeFileSync(`${folder}/github-controls.json`, JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
