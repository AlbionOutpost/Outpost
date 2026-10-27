import { z } from "zod";
export const timerInput = z.object({
  title: z.string().trim().min(1).max(100),
  category: z.enum(["CROP", "ANIMAL", "LABORER", "FOCUS", "REMINDER", "CUSTOM"]),
  durationMinutes: z.number().int().min(1).max(30000),
});
export const timerAction = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["pause", "resume", "reset", "complete"]),
    version: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("rename"),
    version: z.number().int().positive(),
    title: z.string().trim().min(1).max(100),
  }),
]);
export type TimerState = {
  status: string;
  dueAt: Date | null;
  remainingMs: number | null;
  durationMs: number;
};
export function remainingTime(timer: TimerState, now: number) {
  return timer.status === "COMPLETED"
    ? 0
    : timer.status === "PAUSED"
      ? Math.max(0, timer.remainingMs ?? 0)
      : Math.max(0, (timer.dueAt?.getTime() ?? now) - now);
}
export function timerTransition(
  timer: TimerState,
  action: "pause" | "resume" | "reset" | "complete",
  now: number,
) {
  if (action === "pause") {
    if (timer.status !== "RUNNING") throw new Error("Only a running timer can be paused");
    return { status: "PAUSED", dueAt: null, remainingMs: remainingTime(timer, now) };
  }
  if (action === "resume") {
    if (timer.status !== "PAUSED") throw new Error("Only a paused timer can resume");
    return {
      status: "RUNNING",
      dueAt: new Date(now + (timer.remainingMs ?? 0)),
      remainingMs: null,
    };
  }
  if (action === "reset")
    return { status: "RUNNING", dueAt: new Date(now + timer.durationMs), remainingMs: null };
  return { status: "COMPLETED", dueAt: null, remainingMs: 0 };
}
