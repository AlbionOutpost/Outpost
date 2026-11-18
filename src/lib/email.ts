// The email rule of the contact form: one copy for the form (client) and the API (server). It
// checks the address's shape and nothing else. No DOM and no Node types: only URL.

export const EMAIL_MAX = 254;
const LOCAL_MAX = 64;
const DOMAIN_MAX = 253;

/** Controls, bidi overrides and invisible format characters: never in an address. */
const UNSAFE =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2028\u2029\u2060-\u2069\ufeff\s]/;
/** The local part: no @, brackets, quotes (so no quoted local parts), commas, colons or backslashes. */
const LOCAL = /^[^@<>()[\]\\,;:"]+$/;
/** What a domain written with Unicode letters may hold before it is converted. */
const DOMAIN_UNICODE = /^[\p{L}\p{M}\p{N}.-]+$/u;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
/** A top-level domain: letters only (at least two), or punycode for an international one. */
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

export interface Email {
  /** As it is mailed to: the local part as typed, the domain lowercase and, if international, punycode. */
  address: string;
  /** The part after the @, lowercase ASCII (what DNS is asked about). */
  domain: string;
}

/** The domain as lowercase ASCII (punycode for international names), or null. */
function asciiDomain(raw: string): string | null {
  if (!DOMAIN_UNICODE.test(raw)) return null;
  let domain = raw.toLowerCase();
  if (/[^\x00-\x7f]/.test(domain)) {
    try {
      domain = new URL(`http://${raw}`).hostname; // UTS 46 mapping and punycode
    } catch {
      return null;
    }
  }
  if (domain.length > DOMAIN_MAX) return null;
  const labels = domain.split(".");
  if (labels.length < 2) return null;
  for (const label of labels) {
    if (!LABEL.test(label)) return null;
    if (label.slice(2, 4) === "--" && !label.startsWith("xn--")) return null;
  }
  return TLD.test(labels[labels.length - 1]) ? domain : null;
}

/** Checks an address as typed (surrounding spaces are ignored). Null if it cannot be one. */
export function parseEmail(value: string): Email | null {
  const text = value.trim();
  if (text.length > EMAIL_MAX || UNSAFE.test(text)) return null;
  const at = text.indexOf("@");
  if (at < 1 || at !== text.lastIndexOf("@")) return null;
  const local = text.slice(0, at);
  if (
    local.length > LOCAL_MAX ||
    !LOCAL.test(local) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  )
    return null;
  const domain = asciiDomain(text.slice(at + 1));
  if (domain === null) return null;
  const address = `${local}@${domain}`;
  return address.length > EMAIL_MAX ? null : { address, domain };
}
