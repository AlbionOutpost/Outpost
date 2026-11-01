/**
 * Two-handed weapons fill both hands, so the game shows the weapon again, faded, in the off-hand
 * slot. Albion's item ids mark them with `2H_` after the tier (T4_2H_BOW, T8_2H_CLAYMORE@3);
 * the Tracking Toolkit is the one `2H_` item that is one-handed (source-equipment.json agrees on
 * every other family). An id check keeps the catalog out of client bundles.
 */
export function isTwoHanded(itemId: string | null | undefined): boolean {
  return !!itemId && /^T[1-8]_2H_/.test(itemId) && !itemId.includes("2H_TOOL_TRACKING");
}

/** The main-hand item to show faded in an empty off-hand slot, or null. */
export function offHandShadow(
  mainHand: string | null | undefined,
  offHand: string | null | undefined,
): string | null {
  return !offHand && isTwoHanded(mainHand) ? mainHand! : null;
}
