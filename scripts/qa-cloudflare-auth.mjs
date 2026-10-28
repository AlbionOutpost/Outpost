import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const origin = "https://albionoutpost.com",
  cookies = new Map(),
  observed = [];
async function request(path, options = {}) {
  const response = await fetch(origin + path, {
    ...options,
    headers: {
      Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
      ...options.headers,
    },
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const first = cookie.split(";")[0],
      split = first.indexOf("=");
    cookies.set(first.slice(0, split), first.slice(split + 1));
    observed.push({
      name: first.slice(0, split),
      secure: /;\s*Secure/i.test(cookie),
      httpOnly: /;\s*HttpOnly/i.test(cookie),
      sameSite: /;\s*SameSite=Lax/i.test(cookie),
    });
  }
  return response;
}
try {
  const csrf = await request("/api/auth/csrf");
  assert.equal(csrf.status, 200);
  const { csrfToken } = await csrf.json();
  assert.equal(typeof csrfToken, "string");
  const started = await request("/api/auth/signin/discord", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: origin },
    body: new URLSearchParams({ csrfToken, callbackUrl: origin + "/", json: "true" }),
  });
  assert.equal(started.status, 200);
  const { url } = await started.json(),
    authorization = new URL(url);
  assert.equal(authorization.hostname, "discord.com");
  assert.equal(authorization.searchParams.get("client_id"), "1564994799722045560");
  assert.equal(
    authorization.searchParams.get("redirect_uri"),
    origin + "/api/auth/callback/discord",
  );
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
  assert.ok(authorization.searchParams.get("state"));
  assert.ok(authorization.searchParams.get("code_challenge"));
  for (const suffix of ["csrf-token", "state", "pkce.code_verifier"]) {
    const row = observed.find((cookie) => cookie.name.endsWith(suffix));
    assert.ok(row, `Missing ${suffix} cookie`);
    assert.ok(
      row.secure && row.httpOnly && row.sameSite,
      `${suffix} cookie security flags missing`,
    );
  }
  const report = {
    checkedAt: new Date().toISOString(),
    status: "PASS",
    authorizeHost: authorization.hostname,
    canonicalCallback: origin + "/api/auth/callback/discord",
    pkce: "S256",
    stateIssued: true,
    cookies: observed,
    ownerDiscordId: "303585687460904970",
    actualConsentAndTokenExchange: "NOT VERIFIED",
    actualAdminAssignment: "Requires the owner's genuine sign-in",
    providerRequestFollowed: false,
  };
  writeFileSync(".qa/cloudflare-launch/hosted-auth-start.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  writeFileSync(
    ".qa/cloudflare-launch/hosted-auth-start.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        status: "FAIL",
        error: error instanceof Error ? error.message : "Auth start failed",
        cookies: observed,
      },
      null,
      2,
    ),
  );
  console.error(error instanceof Error ? error.message : "Auth start failed");
  process.exitCode = 1;
}
