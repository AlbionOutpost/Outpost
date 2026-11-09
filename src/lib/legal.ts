/**
 * The legal page (/legal: notice, privacy and terms) stays unpublished until the operator details
 * are final (owner, 8 Nov 2026). Off: /legal answers 404 and no page links to it. Turn it on here.
 */
export const legalPublished = false;

/**
 * Kleinunternehmer (§ 19 UStG): set `OPERATOR_SMALL_BUSINESS=true` once the operator has that
 * status, and the order box and terms say that no VAT is charged. Unset, prices are described
 * neutrally ("as shown at checkout, including any VAT that applies").
 */
export const smallBusiness = () => process.env.OPERATOR_SMALL_BUSINESS?.trim() === "true";
