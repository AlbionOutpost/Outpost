import { remainingTime, type TimerState } from "@/lib/timers/engine";

const categories: Record<string, string> = {
  CUSTOM: "Custom",
  CROP: "Crops",
  ANIMAL: "Animals",
  LABORER: "Laborers",
  FOCUS: "Focus",
  REMINDER: "Reminder",
};
const statuses: Record<string, string> = {
  RUNNING: "Running",
  PAUSED: "Paused",
  COMPLETED: "Done",
};

export const timerCategories = Object.entries(categories);
export const timerCategory = (category: string) => categories[category] ?? category;
export const timerStatus = (status: string) => statuses[status] ?? status;

/** Whole seconds as "2h 05m", "12m 30s" or "45s". */
export function countdown(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h) return `${h}h ${pad(m)}m`;
  if (m) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

/** "12m 30s left", or "Due" once the countdown has run out. */
export function timerLeft(timer: TimerState, now: number) {
  const left = Math.ceil(remainingTime(timer, now) / 1000);
  return left > 0 ? `${countdown(left)} left` : "Due";
}
