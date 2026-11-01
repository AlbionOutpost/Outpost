import { it, expect } from "vitest";
import { validateEnvironment } from "../src/lib/env";
const good = {
  DATABASE_URL: "postgresql://test:test@localhost/atlas_test",
  REDIS_URL: "redis://localhost:6379",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "x".repeat(48),
  NODE_ENV: "production",
};
it("accepts a valid local production test configuration", () =>
  expect(validateEnvironment(good).NEXTAUTH_URL).toBe(good.NEXTAUTH_URL));
it("rejects incomplete OAuth pairs and insecure public origins", () => {
  expect(() => validateEnvironment({ ...good, DISCORD_CLIENT_ID: "one" })).toThrow();
  expect(() => validateEnvironment({ ...good, NEXTAUTH_URL: "http://example.com" })).toThrow();
});
it("never includes secret values in configuration errors", () => {
  expect(() => validateEnvironment({ ...good, NEXTAUTH_SECRET: "sensitive" })).toThrow(
    "NEXTAUTH_SECRET",
  );
  try {
    validateEnvironment({ ...good, NEXTAUTH_SECRET: "sensitive" });
  } catch (e) {
    expect(String(e)).not.toContain("sensitive");
  }
});
