export type LegalLocale = "en" | "de";

const maxHeaderLength = 4096;
const maxLanguageRanges = 32;

/** Request-local language selection; no persistence, outbound translation or shared cache. */
export function resolveLegalLocale(
  explicit: string | string[] | undefined,
  acceptLanguage: string | null,
): LegalLocale {
  // Repeated conflicting parameters are ambiguous rather than an ordering preference.
  const selected = Array.isArray(explicit)
    ? explicit.length === 1
      ? explicit[0]
      : undefined
    : explicit;
  if (selected === "en" || selected === "de") return selected;
  if (!acceptLanguage || acceptLanguage.length > maxHeaderLength) return "en";

  const ranges = acceptLanguage.split(",");
  if (ranges.length > maxLanguageRanges) return "en";
  let locale: LegalLocale = "en";
  let bestWeight = 0;
  for (const range of ranges) {
    const fields = range.trim().split(";");
    if (fields.length > 2) continue;
    const language = /^(en|de)(?:-[a-z0-9]{1,8})*$/i.exec(fields[0].trim());
    if (!language) continue;
    let weight = 1;
    if (fields.length === 2) {
      // RFC 9110 qvalues have a leading 0/1 and at most 3 fractional digits.
      const quality = /^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.exec(fields[1].trim());
      if (!quality) continue;
      weight = Number(quality[1]);
    }
    if (weight > bestWeight) {
      locale = language[1].toLowerCase() as LegalLocale;
      bestWeight = weight;
    }
  }
  return locale;
}
