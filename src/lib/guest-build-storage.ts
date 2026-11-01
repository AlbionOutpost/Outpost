import { buildInput, type BuildInput } from "./builds/validation";

export const guestBuildDraftLimit = 65536;
export const legacyGuestBuildKey = "outpost-guest-build-v1";
type DeviceStorage = Pick<Storage, "getItem" | "setItem">;
export function guestBuildStorageKey(recoveryKey?: string, sourceCopy = false) {
  return sourceCopy && recoveryKey
    ? `${legacyGuestBuildKey}:${encodeURIComponent(recoveryKey)}`
    : legacyGuestBuildKey;
}
export function readGuestBuildDraft(
  storage: DeviceStorage,
  key: string,
):
  | { status: "empty" }
  | { status: "ready"; draft: BuildInput }
  | { status: "invalid" | "unavailable" } {
  let json: string | null;
  try {
    json = storage.getItem(key);
  } catch {
    return { status: "unavailable" };
  }
  try {
    if (json === null) return { status: "empty" };
    if (new TextEncoder().encode(json).byteLength > guestBuildDraftLimit)
      return { status: "invalid" };
    const parsed = buildInput.safeParse(JSON.parse(json));
    return parsed.success ? { status: "ready", draft: parsed.data } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}
export function writeGuestBuildDraft(
  storage: DeviceStorage,
  key: string,
  draft: unknown,
):
  | { status: "saved"; draft: BuildInput; json: string }
  | { status: "invalid" | "oversized" | "unavailable" } {
  const parsed = buildInput.safeParse(draft);
  if (!parsed.success) return { status: "invalid" };
  const json = JSON.stringify(parsed.data);
  if (new TextEncoder().encode(json).byteLength > guestBuildDraftLimit)
    return { status: "oversized" };
  try {
    storage.setItem(key, json);
    return { status: "saved", draft: parsed.data, json };
  } catch {
    return { status: "unavailable" };
  }
}
