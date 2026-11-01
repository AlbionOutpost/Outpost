import { it, expect } from "vitest";
import { apiHandler, HttpError } from "../src/lib/api-errors";
it("returns safe service errors without leaking database details", async () => {
  const response = await apiHandler("test", async () => {
    throw new Error("postgresql://secret:password@host/database");
  })();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("password");
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("preserves typed client errors", async () => {
  const r = await apiHandler("test", async () => {
    throw new HttpError(413, "Request too large");
  })();
  expect(r.status).toBe(413);
});
