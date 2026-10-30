import type { MasteryLevels } from "./albion/focus";
export const MASTERY_KEY = "outpost:mastery-levels-v1";
export const MASTERY_EVENT = "outpost:mastery-levels";
/** Specialization levels live on this device only; invalid entries are dropped, never trusted. */
export function readMasteryLevels(): MasteryLevels {
  try {
    const raw = JSON.parse(localStorage.getItem(MASTERY_KEY) || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter(
        ([id, level]) =>
          /^[a-z0-9_]{1,80}$/.test(id) &&
          Number.isInteger(level) &&
          (level as number) >= 0 &&
          (level as number) <= 100,
      ),
    ) as MasteryLevels;
  } catch {
    return {};
  }
}
export function writeMasteryLevels(levels: MasteryLevels) {
  try {
    localStorage.setItem(
      MASTERY_KEY,
      JSON.stringify(Object.fromEntries(Object.entries(levels).filter(([, v]) => v > 0))),
    );
    window.dispatchEvent(new Event(MASTERY_EVENT));
    return true;
  } catch {
    return false;
  }
}
