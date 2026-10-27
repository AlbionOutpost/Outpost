import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const [phase, lighthouseCli] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(phase || "") || !lighthouseCli)
  throw new Error("Usage: node scripts/qa-market-performance.mjs PHASE LIGHTHOUSE_CLI_PATH");
const folder = `.qa/next-milestone/performance-${phase}`;
await mkdir(folder, { recursive: true });
const samples = [];
for (let sample = 1; sample <= 3; sample++) {
  const browser = await chromium.launch({ args: ["--remote-debugging-port=9224"] });
  try {
    const file = `${folder}/market-${sample}.json`;
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          lighthouseCli,
          "http://localhost:3001/tools/market?region=europe",
          "--port=9224",
          "--only-categories=performance,accessibility",
          "--output=json",
          `--output-path=${file}`,
          "--quiet",
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      let error = "";
      child.stderr.on("data", (bytes) => {
        error += bytes.toString();
      });
      child.on("error", reject);
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(error.slice(-500)))));
    });
    const report = JSON.parse(await readFile(file, "utf8"));
    if (report.runtimeError) throw new Error(JSON.stringify(report.runtimeError));
    samples.push({
      sample,
      lcp: report.audits["largest-contentful-paint"].numericValue,
      cls: report.audits["cumulative-layout-shift"].numericValue,
      performance: report.categories.performance.score,
      accessibility: report.categories.accessibility.score,
      lcpBreakdown: report.audits["lcp-breakdown-insight"].details,
      throttling: report.configSettings.throttling,
      viewport: report.configSettings.screenEmulation,
      environment: report.environment,
      lighthouseVersion: report.lighthouseVersion,
      buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
    });
    console.log(
      JSON.stringify({ phase, ...samples.at(-1), lcpBreakdown: undefined, environment: undefined }),
    );
  } finally {
    await browser.close();
  }
}
await writeFile(
  `${folder}/summary.json`,
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      phase,
      scope:
        "Production localhost:3001; anonymous initial Market; three fresh local Playwright Chromium processes; Lighthouse default mobile simulated throttling/storage reset; not MCP or field evidence.",
      samples,
    },
    null,
    2,
  ),
);
