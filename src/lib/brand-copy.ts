/** Public wording follows the current product name; original source records retain their provenance. */
export function brandCopy(text: string) {
  return text.replace(
    /(?:Albion\s*Online\s*Grind|AlbionOnlineGrind|AlbionUtil)(?:\.com)?/gi,
    "Outpost",
  );
}
