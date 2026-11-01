/** Cloudflare SQLite limits LIKE patterns to 50 UTF-8 bytes. Prisma binds all values.
 * Replace only long literal LIKE patterns with equivalent instr/substr comparisons;
 * short patterns keep their existing wildcard semantics. No user text enters SQL source.
 */
export function longLiteralLike(sql, args) {
  const values = [...args];
  const placeholders = [];
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (quote) {
      if (char === quote) {
        if (sql[i + 1] === quote) i++;
        else quote = null;
      }
    } else if (["'", '"', "`"].includes(char)) quote = char;
    else if (char === "?") placeholders.push(i);
  }
  const identifier = '(?:`[^`]+`|"[^"]+"|[A-Za-z_][A-Za-z0-9_]*)';
  const expression = new RegExp(`(${identifier}(?:\\.${identifier})*)\\s+LIKE\\s+\\?`, "gi");
  const rewritten = sql.replace(expression, (match, column, offset) => {
    const index = placeholders.indexOf(offset + match.length - 1);
    const pattern = values[index];
    if (typeof pattern !== "string" || new TextEncoder().encode(pattern).length <= 50) return match;
    const leading = pattern.startsWith("%"),
      trailing = pattern.endsWith("%");
    const literal = pattern.slice(leading ? 1 : 0, trailing ? -1 : undefined);
    if (/[%_]/.test(literal)) throw new Error("Long wildcard searches require explicit validation");
    values[index] = literal;
    if (leading && trailing) return `(instr(lower(${column}), lower(?)) > 0)`;
    // Prisma uses contains in current search routes. Leave unsupported generated shapes closed.
    throw new Error("Unsupported long LIKE operator");
  });
  return { sql: rewritten, args: values };
}
