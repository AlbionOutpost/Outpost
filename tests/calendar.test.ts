import { it, expect } from "vitest";
import { eventCalendar } from "../src/lib/groups/calendar";
it("escapes calendar injection, folds UTF-8 by octets and emits UTC/revision status", () => {
  const text = eventCalendar({
    id: "event_1",
    title: "Trip\nBEGIN:VEVENT",
    description: "é".repeat(100) + ";comma,slash\\",
    startsAt: new Date("2026-11-01T18:00:00Z"),
    createdAt: new Date("2026-10-25T18:00:00Z"),
    timezone: "Europe/Berlin",
    voiceInfo: "Discord",
    cancelled: true,
    version: 3,
  });
  expect(text).toContain("DTSTART:20261101T180000Z");
  expect(text).toContain("SEQUENCE:3");
  expect(text).toContain("STATUS:CANCELLED");
  expect(text).toContain("SUMMARY:Trip\\nBEGIN:VEVENT");
  expect(text.match(/\r\nBEGIN:VEVENT\r\n/g)).toHaveLength(1);
  for (const line of text.split("\r\n"))
    expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
});
