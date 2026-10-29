import { expect, test } from "@playwright/test";

test("Discord startup retains the approved return and recovers visibly from failed requests", async ({
  page,
}) => {
  const target = "/compositions/new?fromLibrary=battleaxe-mist-build&region=asia";
  await page.route("**/api/auth/providers", (route) =>
    route.fulfill({ json: { discord: { id: "discord", type: "oauth" } } }),
  );
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({ json: { csrfToken: "local-browser-fixture" } }),
  );
  let attempt = 0,
    postedReturn = "";
  await page.route("**/api/auth/signin/discord", async (route) => {
    postedReturn = new URLSearchParams(route.request().postData() || "").get("callbackUrl") || "";
    attempt++;
    if (attempt === 1)
      return route.fulfill({ status: 503, json: { error: "Private backend diagnostic" } });
    const authorize = new URL("https://discord.com/api/oauth2/authorize");
    authorize.search = new URLSearchParams({
      client_id: "1564994799722045560",
      redirect_uri: "http://localhost:3000/api/auth/callback/discord",
      response_type: "code",
      scope: "identify email",
      state: "fixture-state",
      code_challenge: "fixture-pkce",
      code_challenge_method: "S256",
    }).toString();
    return route.fulfill({ json: { url: authorize.href } });
  });
  let providerReached = false;
  await page.route("https://discord.com/**", async (route) => {
    providerReached = true;
    await route.abort();
  });
  // NextAuth uses an absolute same-origin callback on its OAuth error retry page.
  await page.goto(
    `/signin?error=OAuthCallback&callbackUrl=${encodeURIComponent("http://localhost:3000" + target)}`,
  );
  await page.getByRole("button", { name: "Continue with Discord", exact: true }).click();
  await expect(page.locator(".discord-signin-control [role=alert]")).toContainText(
    "temporarily unavailable",
  );
  await expect(page.locator(".discord-signin-control [role=alert]")).not.toContainText(
    "Private backend",
  );
  await expect(page).toHaveURL(/\/signin\?/);
  await expect(
    page.getByRole("button", { name: "Continue with Discord", exact: true }),
  ).toBeEnabled();
  expect(postedReturn).toBe(target);
  expect(providerReached).toBe(false);
  await page.getByRole("button", { name: "Continue with Discord", exact: true }).click();
  await expect.poll(() => providerReached).toBe(true);
  expect(postedReturn).toBe(target);
  expect(attempt).toBe(2);
});

test("OAuth callback errors stay actionable and forged callbacks do not authenticate a visitor", async ({
  page,
  request,
}) => {
  await page.goto("/signin?error=OAuthCallback");
  await expect(
    page.locator(".signin-page [role=alert]").filter({ hasText: "Discord could not finish" }),
  ).toBeVisible();
  const denied = await request.get(
    "/api/auth/callback/discord?code=invalid-local-fixture&state=invalid-local-state",
    { maxRedirects: 0 },
  );
  expect([302, 303]).toContain(denied.status());
  const next = new URL(denied.headers().location!, "http://localhost:3000");
  expect(next.origin).toBe("http://localhost:3000");
  expect(next.pathname).toBe("/api/auth/error");
  expect(next.searchParams.get("error")).toBe("OAuthCallback");
  const session = await request.get("/api/auth/session");
  expect(await session.json()).toEqual({});
  await page.goto("/signin?error=%3Cscript%3Eprivate-provider-error%3C%2Fscript%3E");
  await expect(page.locator("main")).not.toContainText("private-provider-error");
  await expect(
    page.locator(".signin-page [role=alert]").filter({ hasText: "Sign-in could not be completed" }),
  ).toBeVisible();
});

test("the shared top navigation and Outpost browser icons stay consistent across page families", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let navigationLeft: number | undefined;
  for (const path of ["/", "/signin", "/legal", "/guides", "/builds/library"]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "Main navigation", exact: true });
    await expect(page.locator(".search-trigger")).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const left = (await nav.boundingBox())!.x;
    if (navigationLeft === undefined) navigationLeft = left;
    expect(
      Math.abs(left - navigationLeft),
      `Stable navigation position on ${path}`,
    ).toBeLessThanOrEqual(1);
    await expect(nav.getByRole("link", { name: "Teams", exact: true })).toHaveAttribute(
      "href",
      /\/groups\?region=/,
    );
    await expect(nav.locator(":scope > a > svg")).toHaveCount(0);
    await nav.locator(".more-dropdown > summary").click();
    await expect(nav.getByRole("link", { name: "My dashboard", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(nav.locator(".more-dropdown")).not.toHaveAttribute("open");
    await expect(page.locator('link[rel="icon"][href*="favicon.ico"]')).toHaveCount(1);
  }
  for (const [path, mime] of [
    ["/favicon.ico", /image\/(?:x-icon|vnd\.microsoft\.icon)/],
    ["/icon.svg", /image\/svg\+xml/],
    ["/apple-icon.png", /image\/png/],
  ] as const) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(mime);
    expect((await response.body()).byteLength).toBeGreaterThan(100);
  }
});
