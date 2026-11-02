import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const legacyPaths = [
  "@eslint/config-array",
  "@eslint/eslintrc",
  "eslint-config-next",
  "eslint",
].map((name) => `node_modules/${name}/node_modules/minimatch`);
const sourceHash = "746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d";
const advisoryUrl = "https://github.com/advisories/GHSA-g3hv-75wg-m249";
const knownPropagation = new Set([
  "@eslint-community/eslint-utils",
  "@eslint/config-array",
  "@eslint/eslintrc",
  "@next/eslint-plugin-next",
  "@typescript-eslint/eslint-plugin",
  "@typescript-eslint/parser",
  "@typescript-eslint/type-utils",
  "@typescript-eslint/utils",
  "eslint",
  "eslint-config-next",
  "eslint-import-resolver-typescript",
  "eslint-plugin-import",
  "eslint-plugin-jsx-a11y",
  "eslint-plugin-react",
  "eslint-plugin-react-hooks",
  "minimatch",
  "typescript-eslint",
]);

/** Applicability guard only: passing does not change the raw audit or clear its advisories. */
export function verifyToolingAssessment(audit, artifacts) {
  assert.equal(audit.auditReportVersion, 2, "Unexpected audit format; reassessment required");
  assert(!audit.error, "Audit failed; no assessment can be established");
  const vulnerabilities = audit.vulnerabilities;
  assert(
    vulnerabilities?.minimatch,
    "Known advisory absent; reassess or retire this exception guard",
  );
  const counts = audit.metadata?.vulnerabilities;
  assert(
    counts &&
      counts.total === Object.keys(vulnerabilities).length &&
      counts.moderate === counts.total,
    "Unexpected audit counts/severities; reassessment required",
  );
  for (const severity of ["info", "low", "high", "critical"])
    assert.equal(counts[severity], 0, "Unexpected severity");
  assert.deepEqual(
    [...vulnerabilities.minimatch.nodes].sort(),
    [...legacyPaths].sort(),
    "Legacy dependency paths changed",
  );
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    assert(knownPropagation.has(name), `Unexpected affected dependency: ${name}`);
    assert.equal(vulnerability.severity, "moderate", "Unexpected severity");
    assert(vulnerability.via.length, "Unexplained audit entry");
    for (const via of vulnerability.via) {
      if (typeof via === "string")
        assert(vulnerabilities[via], `Unresolved advisory propagation: ${via}`);
      else {
        assert.equal(name, "minimatch", "Unexpected direct advisory owner");
        assert.equal(via.url, advisoryUrl, "New/unexpected advisory; reassessment required");
        assert.equal(via.name, "minimatch");
        assert.equal(via.dependency, "minimatch");
        assert.equal(via.range, "<11.0.1", "Advisory scope changed");
        assert.equal(via.severity, "moderate");
        assert(via.title.includes("globparts amplification"), "Advisory mechanism changed");
      }
    }
  }
  assert(
    vulnerabilities.minimatch.via.some((via) => typeof via !== "string"),
    "Missing underlying advisory",
  );
  for (const name of Object.keys(vulnerabilities)) {
    const pending = [name],
      seen = new Set();
    let explained = false;
    for (let dependency = pending.pop(); dependency; dependency = pending.pop()) {
      if (seen.has(dependency)) continue;
      seen.add(dependency);
      if (dependency === "minimatch") {
        explained = true;
        break;
      }
      pending.push(...vulnerabilities[dependency].via.filter((via) => typeof via === "string"));
    }
    assert(explained, `Unexplained advisory propagation: ${name}`);
  }
  assert.deepEqual(artifacts.map((artifact) => artifact.path).sort(), [...legacyPaths].sort());
  for (const artifact of artifacts) {
    assert.equal(artifact.version, "3.1.5", "Legacy version changed");
    assert.equal(artifact.sha256, sourceHash, "Legacy source changed; reassessment required");
    assert.equal(artifact.developmentOnly, true, "Legacy dependency reached production scope");
    assert.equal(artifact.callable, true, "Legacy callable API changed");
    assert.equal(artifact.mechanismAbsent, true, "Assessed mechanism is no longer absent");
    assert.equal(artifact.globParts, 1, "Legacy preprocessing behavior changed");
  }
  return {
    rawAudit: counts,
    knownAdvisory: advisoryUrl,
    artifacts,
    assessment: "Known-mechanism applicability only; raw audit is NOT clean",
  };
}

function installedArtifacts(root) {
  const require = createRequire(resolve(root, "package.json"));
  const lock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));
  return legacyPaths.map((path) => {
    const source = readFileSync(resolve(root, path, "minimatch.js"));
    const sha256 = createHash("sha256").update(source).digest("hex");
    assert.equal(sha256, sourceHash, "Legacy source changed; reassess before executing its probe");
    const version = JSON.parse(readFileSync(resolve(root, path, "package.json"), "utf8")).version;
    assert.equal(version, "3.1.5", "Legacy version changed");
    const matcher = require(resolve(root, path, "minimatch.js"));
    const probe = new matcher.Minimatch("a/**/../b/**/../c/**/../d", { optimizationLevel: 2 });
    return {
      path,
      version,
      sha256,
      developmentOnly: lock.packages[path]?.dev === true,
      callable: typeof matcher === "function",
      globParts: probe.globParts.length,
      mechanismAbsent:
        ["firstPhasePreProcess", "secondPhasePreProcess", "optimizationLevel"].every(
          (marker) => !source.includes(marker),
        ) &&
        probe.firstPhasePreProcess === undefined &&
        probe.secondPhasePreProcess === undefined,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = process.cwd();
    const file = process.argv[2];
    const raw = file
      ? readFileSync(file, "utf8")
      : spawnSync("npm", ["audit", "--json"], {
          cwd: root,
          encoding: "utf8",
          maxBuffer: 8 * 1024 * 1024,
          timeout: 30000,
        }).stdout;
    const audit = JSON.parse(raw);
    console.log(
      `Raw npm audit: ${audit.metadata?.vulnerabilities?.total ?? "unknown"} advisories (${file ? "supplied raw report" : "live scan"}); no alerts suppressed.`,
    );
    console.log(JSON.stringify(verifyToolingAssessment(audit, installedArtifacts(root)), null, 2));
  } catch (error) {
    console.error(`Tooling assessment FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
