import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const headers = {};
const origin = "https://albionoutpost.com",
  results = [];
const check = async (name, run) => {
  const value = await run();
  results.push({ name, status: "PASS", ...value });
  console.log(`PASS ${name}`);
};
const request = (path, options = {}) => {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error("Never forward preview credentials to another host");
  return fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
};
try {
  await check("anonymous visitors can open the public site", async () => {
    const response = await request("/");
    assert.equal(response.status, 200);
    assert.ok(!response.headers.get("Location")?.includes("cloudflareaccess"));
  });
  await check("www redirects to the canonical OAuth host", async () => {
    const response = await fetch("https://www.albionoutpost.com/signin?region=europe", {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 308);
    assert.equal(
      response.headers.get("Location"),
      "https://albionoutpost.com/signin?region=europe",
    );
  });
  await check("SQLite and cache bindings are healthy on owned HTTPS", async () => {
    const response = await request("/api/health"),
      body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.dependencies, { sqlite: "ok", cache: "ok" });
    assert.equal(body.authentication, "configured-unverified");
    return { dependencies: body.dependencies };
  });
  for (const path of [
    "/",
    "/builds/new",
    "/builds/library",
    "/builds/library/battleaxe-mist-build",
    "/compositions/library",
    "/guides",
    "/guides/albion-journal-guide",
    "/tools/fishing",
    "/items",
    "/signin",
  ]) {
    await check(`hosted page ${path}`, async () => {
      const response = await request(path),
        body = await response.text();
      assert.equal(response.status, 200);
      assert.ok(body.includes("<html"));
      assert.ok(!body.includes("Application error: a server-side exception"));
      assert.ok(!body.includes("Error 1102"));
      return { bytes: Buffer.byteLength(body) };
    });
  }
  await check("reviewed item catalog and long literal search use D1", async () => {
    const response = await request("/api/items?search=axe&tier=4"),
      body = await response.json();
    assert.equal(response.status, 200);
    assert.ok(body.total > 0);
    assert.ok(body.items.every((item) => item.tier === 4));
    const empty = await request(`/api/items?search=${"a".repeat(100)}`);
    assert.equal(empty.status, 200);
    assert.equal((await empty.json()).total, 0);
  });
  for (const region of ["americas", "europe", "asia"])
    await check(`actual ${region} market observations`, async () => {
      const response = await request(`/api/market?region=${region}&item=T4_MAIN_AXE&quality=1`),
        body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.region, region);
      assert.equal(body.source, "Albion Online Data Project");
      assert.ok(Array.isArray(body.prices));
      assert.ok(body.prices.every((row) => row.item_id === "T4_MAIN_AXE" && row.quality === 1));
      return { region, observations: body.prices.length };
    });
  await check("actual gold history retains source observations", async () => {
    const response = await request("/api/history?kind=gold&region=europe"),
      body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.source, "Albion Online Data Project");
    assert.ok(Array.isArray(body.data));
    return { observations: body.data.length };
  });
  for (const path of ["/api/account/export", "/api/admin/reports", "/api/market-watch"])
    await check(`anonymous visitors cannot access Discord user data ${path}`, async () => {
      const response = await request(path);
      assert.equal(response.status, 401);
      assert.ok(response.headers.get("Cache-Control")?.includes("no-store"));
    });
  await check("unauthenticated build mutation is denied", async () => {
    const response = await request("/api/builds", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 401);
  });
  for (const path of ["/.env", "/.git/config", "/api/internal/verification-probe"])
    await check(`owned sensitive-path WAF denial ${path}`, async () => {
      assert.equal((await request(path)).status, 403);
    });
  writeFileSync(
    ".qa/cloudflare-launch/hosted-smoke.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        status: "PASS",
        results,
        actualHumanOAuth: "NOT VERIFIED",
        publicAccess: true,
        trafficAndCpuCertification: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  writeFileSync(
    ".qa/cloudflare-launch/hosted-smoke.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        status: "FAIL",
        results,
        error: error instanceof Error ? error.message : "Hosted check failed",
      },
      null,
      2,
    ),
  );
  console.error(error instanceof Error ? error.message : "Hosted check failed");
  process.exitCode = 1;
}
