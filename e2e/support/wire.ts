/** Test-only structured transport. Every value is framed, so user JSON cannot forge Date tags. */
export type Wire =
  | ["value", string | number | boolean | null]
  | ["undefined"]
  | ["date", string]
  | ["array", Wire[]]
  | ["object", Record<string, Wire>];
export function encode(value: unknown): Wire {
  if (value === undefined) return ["undefined"];
  if (value instanceof Date) return ["date", value.toISOString()];
  if (Array.isArray(value)) return ["array", value.map(encode)];
  if (value !== null && typeof value === "object")
    return [
      "object",
      Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)])),
    ];
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return ["value", value];
  throw new Error("Unsupported test fixture value");
}
export function decode(value: Wire): unknown {
  if (value[0] === "undefined") return undefined;
  if (value[0] === "date") return new Date(value[1]);
  if (value[0] === "array") return value[1].map(decode);
  if (value[0] === "object")
    return Object.fromEntries(Object.entries(value[1]).map(([key, child]) => [key, decode(child)]));
  return value[1];
}
