import { it, expect } from "vitest";
import { redactLog } from "../scripts/qa-ci-evidence.mjs";
it("redacts configured values, credentials and cookie headers without hiding failure causes", () => {
  const result = redactLog(
    "Error: Test timeout\nconfigured-secret\nAuthorization: Bearer unknown-session\nSet-Cookie: next-auth.session-token=unknown\nhttp://name:password@localhost/path",
    ["configured-secret"],
  );
  expect(result).toContain("Test timeout");
  for (const value of [
    "configured-secret",
    "unknown-session",
    "next-auth.session-token=unknown",
    "password",
  ])
    expect(result).not.toContain(value);
  expect(result).toContain("[REDACTED]");
});
