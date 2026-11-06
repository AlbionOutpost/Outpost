/**
 * A readable name for a game item ID while (or if) the game-data lookup has none:
 * "T4_CLOTH_LEVEL1@1" → "Cloth · T4.1". The looked-up name always wins.
 */
export function itemLabel(id: string, names: Record<string, string | undefined> = {}) {
  const known = names[id];
  if (known) return known;
  const m = /^T(\d)_([A-Z0-9_]+?)(?:_LEVEL\d)?(?:@(\d))?$/.exec(id);
  if (!m) return id;
  const base = m[2].replace(/_/g, " ").toLowerCase();
  return `${base[0].toUpperCase()}${base.slice(1)} · T${m[1]}.${m[3] ?? 0}`;
}
