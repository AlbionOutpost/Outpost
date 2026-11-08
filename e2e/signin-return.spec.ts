import { expect, test, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

async function signIn(context: BrowserContext) {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Return tester",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return id;
}

test("a signed-in-only page sends the visitor to sign-in and Discord back to that page", async ({
  page,
}) => {
  await page.route("**/api/auth/providers", (route) =>
    route.fulfill({ json: { discord: { id: "discord", type: "oauth" } } }),
  );
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({ json: { csrfToken: "local-browser-fixture" } }),
  );
  const posted: string[] = [];
  await page.route("**/api/auth/signin/discord", (route) => {
    posted.push(new URLSearchParams(route.request().postData() || "").get("callbackUrl") || "");
    return route.fulfill({ status: 503, json: { error: "fixture" } });
  });
  await page.goto("/timers");
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Ftimers$/);
  await expect(page.locator("[data-signin]")).toContainText("you go straight to your timers");
  await expect(
    page.getByRole("heading", { level: 1, name: "Keep your timers running" }),
  ).toBeVisible();
  // Clicks before hydration do nothing, so retry until the start request is seen.
  const start = async (expected: string) => {
    posted.length = 0;
    await expect(async () => {
      await page.getByRole("button", { name: "Continue with Discord", exact: true }).click();
      expect(posted.at(-1)).toBe(expected);
    }).toPass();
  };
  await start("/timers");
  // A foreign or absolute destination is never posted to NextAuth.
  for (const foreign of ["https://attacker.invalid/timers", "//attacker.invalid/timers"]) {
    await page.goto(`/signin?callbackUrl=${encodeURIComponent(foreign)}`);
    await start("/settings");
  }
  await page.goto("/builds/clx0fixture/edit");
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fbuilds%2Fclx0fixture%2Fedit$/);
});

test("a signed-in player returns to the page they asked for, never to another origin", async ({
  page,
  context,
}) => {
  const id = await signIn(context);
  try {
    await page.goto("/signin?callbackUrl=%2Ftimers");
    await expect(page).toHaveURL(/\/timers$/);
    for (const foreign of [
      "https://attacker.invalid/timers",
      "//attacker.invalid/timers",
      "/\\attacker.invalid",
    ]) {
      await page.goto(`/signin?callbackUrl=${encodeURIComponent(foreign)}`);
      await expect(page).toHaveURL(/^http:\/\/localhost:3000\/settings/);
    }
  } finally {
    await db.user.delete({ where: { id } }).catch(() => {});
  }
});

test("home offers the dashboard to a signed-in player and sign-in to a visitor", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const hero = page.locator(".landing-actions");
  await expect(hero.getByRole("link", { name: /^Sign in/ })).toHaveAttribute(
    "href",
    /^\/signin\?callbackUrl=%2Fdashboard/,
  );
  const id = await signIn(context);
  try {
    await page.goto("/");
    await expect(hero.getByRole("link", { name: /^Sign in/ })).toHaveCount(0);
    await expect(hero.getByRole("link", { name: /^Your dashboard/ })).toHaveAttribute(
      "href",
      /^\/dashboard/,
    );
  } finally {
    await db.user.delete({ where: { id } }).catch(() => {});
  }
});

test("saving a comp with no members says what to do, in words", async ({ page, context }) => {
  const id = await signIn(context);
  try {
    await page.goto("/compositions/new");
    const saveBar = page.locator("[data-comp-editor]");
    await expect(page.getByLabel("Import comp file")).toBeEnabled();
    await expect(saveBar.getByRole("status").first()).toContainText("New comp · not saved");
    await expect(page.getByLabel("Comp title")).toHaveAttribute("placeholder", "ZvZ · party");
    await page.getByLabel("Comp title").fill("Empty roster test");
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    const alert = saveBar.getByRole("alert");
    await expect(alert).toHaveText(/Add at least one member before saving/);
    await expect(alert).not.toContainText("expected");
    await page.getByRole("button", { name: "5 players", exact: true }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByLabel("Comp title")).toHaveAttribute("placeholder", "ZvZ · 5 players");
  } finally {
    await db.user.delete({ where: { id } }).catch(() => {});
  }
});
