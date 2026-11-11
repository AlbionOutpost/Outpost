/**
 * The legal page (/legal: Impressum, privacy policy and terms). Published 11 Nov 2026 with the
 * operator's details (owner's decision). Off, /legal answers 404 and no page links to it.
 */
export const legalPublished = true;

/**
 * Kleinunternehmer (§ 19 UStG): set `OPERATOR_SMALL_BUSINESS=true` once the operator has that
 * status, and the order box and terms say that no VAT is charged. Unset, prices are described
 * neutrally ("as shown at checkout, including any VAT that applies").
 */
export const smallBusiness = () => process.env.OPERATOR_SMALL_BUSINESS?.trim() === "true";

/** The operator as the Impressum, privacy policy and terms name it. */
export type LegalOperator = {
  /** `OPERATOR_NAME`: the business and its owner, e.g. "Hollow Lantern, Inhaber Rotenda Sino". */
  name?: string;
  /** `OPERATOR_ADDRESS`: the address for service, one line per row (see `addressLines`). */
  address?: string;
  email?: string;
  /** `OPERATOR_EDITOR`: the person responsible for editorial content (§ 18 Abs. 2 MStV). */
  editor?: string;
  /** `OPERATOR_SMALL_BUSINESS`: the terms say no VAT is charged (§ 19 UStG). */
  smallBusiness?: boolean;
};

/** Operator details come only from the Worker vars (`scripts/cloudflare-release-config.mjs`). */
export function legalOperator(): LegalOperator {
  return {
    name: process.env.OPERATOR_NAME?.trim() || undefined,
    address: process.env.OPERATOR_ADDRESS?.trim() || undefined,
    email: process.env.OPERATOR_EMAIL?.trim() || undefined,
    editor: process.env.OPERATOR_EDITOR?.trim() || undefined,
    smallBusiness: smallBusiness(),
  };
}

/**
 * The address rows. `OPERATOR_ADDRESS` holds one row per line (a real newline, or a literal `\n`
 * as a dashboard or .env file may store it); a single line is split at its commas instead.
 */
export function addressLines(address?: string) {
  if (!address?.trim()) return [];
  const rows = address.split(/\r?\n|\\n/);
  return (rows.length > 1 ? rows : address.split(/,\s*/)).map((row) => row.trim()).filter(Boolean);
}
