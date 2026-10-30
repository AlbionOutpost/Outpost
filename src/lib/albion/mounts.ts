import mountData from "./game/mounts.json" with { type: "json" };
export type Mount = {
  id: string;
  name: string;
  tier: number | null;
  itemWeight: number | null;
  /** quality 1–5 → carry weight bonus in kg */
  capacity: Record<string, number>;
  speed?: number | null;
  speedLabel?: string;
  category?: string;
};
export const mountSource = mountData.source;
export const mounts = (mountData.mounts as Mount[]).toSorted(
  (a, b) => (b.capacity["1"] ?? 0) - (a.capacity["1"] ?? 0) || a.name.localeCompare(b.name),
);
/** Carry weight a mount adds at a quality (1–5), or null when unknown. */
export function mountCapacity(id: string, quality: number) {
  const mount = mounts.find((m) => m.id === id);
  if (!mount) return null;
  return mount.capacity[String(quality)] ?? null;
}
