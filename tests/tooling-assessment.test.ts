import { expect, it } from "vitest";
const { verifyToolingAssessment, parseAuditProcess, legacyPaths } = await import(
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

function cleanFixture() {
  const { artifacts } = fixture();
  return {
    artifacts,
    audit: {
      auditReportVersion: 2,
      vulnerabilities: {},
      metadata: {
        vulnerabilities: { total: 0, moderate: 0, info: 0, low: 0, high: 0, critical: 0 },
      },
    },
  };
}
it("accepts a clean scan without inventing an advisory exception", () => {
  const { audit, artifacts } = cleanFixture();
  const assessment = verifyToolingAssessment(audit, artifacts);
  expect(assessment.rawAudit.total).toBe(0);
  expect(assessment.artifacts).toHaveLength(4);
  expect(assessment.knownAdvisory).toBeUndefined();
  expect(assessment.assessment).toContain("at scan time");
});
it("rejects contradictory or malformed clean audit counts", () => {
  for (const severity of ["total", "info", "low", "moderate", "high", "critical"] as const) {
    for (const value of [1, -1, "0", null]) {
      const { audit, artifacts } = cleanFixture();
      const malformed = {
        ...audit,
        metadata: { vulnerabilities: { ...audit.metadata.vulnerabilities, [severity]: value } },
      };
      expect(() => verifyToolingAssessment(malformed, artifacts)).toThrow();
    }
  }
  const missingSeverity = cleanFixture();
  const incompleteCounts: Partial<typeof missingSeverity.audit.metadata.vulnerabilities> = {
    ...missingSeverity.audit.metadata.vulnerabilities,
  };
  delete incompleteCounts.critical;
  expect(() =>
    verifyToolingAssessment(
      {
        ...missingSeverity.audit,
        metadata: { vulnerabilities: incompleteCounts },
      },
      missingSeverity.artifacts,
    ),
  ).toThrow();
  for (const report of [
    { auditReportVersion: 2, metadata: cleanFixture().audit.metadata },
    { auditReportVersion: 1, vulnerabilities: {} },
    { auditReportVersion: 2, vulnerabilities: [] },
    { auditReportVersion: 2, vulnerabilities: null },
    { auditReportVersion: 2, error: { code: "EAUDIT" }, vulnerabilities: {} },
  ]) {
    expect(() => verifyToolingAssessment(report, cleanFixture().artifacts)).toThrow();
  }
});
it("never accepts an unexpected finding disguised by zero counts", () => {
  const { audit, artifacts } = cleanFixture();
  expect(() =>
    verifyToolingAssessment(
      {
        ...audit,
        vulnerabilities: { unknown: { severity: "high", via: [], nodes: [] } },
      },
      artifacts,
    ),
  ).toThrow();
  expect(() =>
    verifyToolingAssessment(
      {
        ...audit,
        vulnerabilities: fixture().audit.vulnerabilities,
      },
      artifacts,
    ),
  ).toThrow();
});
it("retains every artifact and production-scope constraint even when audit is clean", () => {
  for (const [field, value] of [
    ["sha256", "changed"],
    ["version", "11.0.4"],
    ["developmentOnly", false],
    ["callable", false],
    ["mechanismAbsent", false],
    ["globParts", 2],
  ] as const) {
    const { audit, artifacts } = cleanFixture();
    artifacts[0][field] = value;
    expect(() => verifyToolingAssessment(audit, artifacts)).toThrow();
  }
  const { audit, artifacts } = cleanFixture();
  expect(() => verifyToolingAssessment(audit, artifacts.slice(1))).toThrow();
  artifacts[0].path = "node_modules/unreviewed/minimatch";
  expect(() => verifyToolingAssessment(audit, artifacts)).toThrow();
});
it("accepts npm exit1 only for a real advisory report and rejects process failures", () => {
  const clean = { status: 0, stdout: JSON.stringify(cleanFixture().audit) };
  expect(parseAuditProcess(clean).metadata.vulnerabilities.total).toBe(0);
  expect(
    parseAuditProcess({ status: 1, stdout: JSON.stringify(fixture().audit) }).metadata
      .vulnerabilities.total,
  ).toBe(1);
  for (const process of [
    { ...clean, status: 1 },
    { ...clean, status: 2 },
    { ...clean, status: null },
    { ...clean, signal: "SIGTERM" },
    { ...clean, error: new Error("timed out") },
    { ...clean, stdout: "truncated" },
    { ...clean, stdout: JSON.stringify({ error: { code: "EAUDIT" } }) },
  ])
    expect(() => parseAuditProcess(process)).toThrow();
});
