import { it, expect } from "vitest";
import { remainingTime, timerTransition, timerInput } from "../src/lib/timers/engine";
it("preserves remaining duration across pause/resume and resets explicitly", () => {
  const t = { status: "RUNNING", dueAt: new Date(100000), remainingMs: null, durationMs: 60000 };
  expect(remainingTime(t, 40000)).toBe(60000);
  const paused = { ...t, ...timerTransition(t, "pause", 70000) };
  expect(paused.remainingMs).toBe(30000);
  expect(remainingTime(paused, 200000)).toBe(30000);
  const resumed = { ...paused, ...timerTransition(paused, "resume", 200000) };
  expect(resumed.dueAt?.getTime()).toBe(230000);
  expect(timerTransition(resumed, "reset", 500000).dueAt?.getTime()).toBe(560000);
  expect(timerTransition(resumed, "complete", 500000).status).toBe("COMPLETED");
  expect(() => timerTransition(paused, "pause", 0)).toThrow();
  expect(timerInput.safeParse({ title: "x", category: "CUSTOM", durationMinutes: 0 }).success).toBe(
    false,
  );
});
