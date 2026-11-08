import { expect, it } from "vitest";
import { gameTime, localTime, relativeTime } from "../src/lib/game-time";

const at = new Date("2026-11-09T04:57:00Z");
it("shows the stored instant in UTC game time", () => {
  expect(gameTime(at)).toBe("Mon 9 Nov · 04:57 UTC");
});
it("adds the viewer's own clock, with the day only when it differs", () => {
  expect(localTime(at, "Europe/London")).toBeNull();
  expect(localTime(at, "Europe/Berlin")).toBe("05:57 your time");
  expect(localTime(at, "America/Los_Angeles")).toBe("Sun 8 Nov 20:57 your time");
  expect(localTime(at, "UTC")).toBeNull();
});
it("says how far away the moment is, either side of now", () => {
  const now = at.getTime();
  expect(relativeTime(at, now - 23 * 3_600_000)).toBe("in 23 h");
  expect(relativeTime(at, now - 45 * 60_000)).toBe("in 45 min");
  expect(relativeTime(at, now - 3 * 86_400_000)).toBe("in 3 days");
  expect(relativeTime(at, now + 2 * 3_600_000)).toBe("2 h ago");
  expect(relativeTime(at, now + 10_000)).toBe("now");
});
