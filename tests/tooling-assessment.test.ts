import { expect, it } from "vitest";
const { verifyToolingAssessment, legacyPaths } = await import(
  new URL("../scripts/verify-tooling-assessment.mjs", import.meta.url).href
);
function fixture() {
  return {
    audit: {
      auditReportVersion: 2,
      metadata: {
        vulnerabilities: { total: 1, moderate: 1, info: 0, low: 0, high: 0, critical: 0 },
      },
      vulnerabilities: {
        minimatch: {
          severity: "moderate",
          nodes: [...legacyPaths],
          via: [
            {
              url: "https://github.com/advisories/GHSA-g3hv-75wg-m249",
              name: "minimatch",
              dependency: "minimatch",
              title: "minimatch has potential denial of service via globparts amplification",
              range: "<11.0.1",
              severity: "moderate",
            },
          ],
        },
      },
    },
    artifacts: legacyPaths.map((path: string) => ({
      path,
      version: "3.1.5",
      sha256: "746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d",
      developmentOnly: true,
      callable: true,
      mechanismAbsent: true,
      globParts: 1,
    })),
  };
}
it("assesses only the known mechanism and retains the nonzero raw count", () => {
  const { audit, artifacts } = fixture();
  expect(verifyToolingAssessment(audit, artifacts).rawAudit.total).toBe(1);
});
it("fails for a new advisory, changed scope, path or severity", () => {
  for (const field of ["url", "range", "severity"] as const) {
    const { audit, artifacts } = fixture();
    audit.vulnerabilities.minimatch.via[0][field] = "unexpected";
    expect(() => verifyToolingAssessment(audit, artifacts)).toThrow();
  }
  const { audit, artifacts } = fixture();
  audit.vulnerabilities.minimatch.nodes.push("node_modules/unreviewed/minimatch");
  expect(() => verifyToolingAssessment(audit, artifacts)).toThrow();
});
it("rejects a propagated entry that is not explained by the known advisory", () => {
  const { audit, artifacts } = fixture();
  const unexplained = {
    ...audit,
    metadata: { vulnerabilities: { ...audit.metadata.vulnerabilities, total: 2, moderate: 2 } },
    vulnerabilities: {
      ...audit.vulnerabilities,
      eslint: { severity: "moderate", via: ["eslint"] },
    },
  };
  expect(() => verifyToolingAssessment(unexplained, artifacts)).toThrow(
    "Unexplained advisory propagation",
  );
});
it("fails for changed source, version, runtime scope or preprocessing behavior", () => {
  for (const [field, value] of [
    ["sha256", "changed"],
    ["version", "11.0.4"],
    ["developmentOnly", false],
    ["callable", false],
    ["mechanismAbsent", false],
    ["globParts", 2],
  ] as const) {
    const { audit, artifacts } = fixture();
    artifacts[0][field] = value;
    expect(() => verifyToolingAssessment(audit, artifacts)).toThrow();
  }
});
