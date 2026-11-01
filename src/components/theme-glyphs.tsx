/** The theme switch's own glyphs: a sun with a solid core and tapered rays, and a crescent moon
 * with two small stars. Drawn for 20px, currentColor, so the switch tints them. */
export function SunGlyph() {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="theme-glyph">
      <circle cx="10" cy="10" r="4.2" fill="currentColor" />
      {rays.map((a) => (
        <path
          key={a}
          d="M10 1.6 L11 4.6 L10 4.1 L9 4.6 Z"
          fill="currentColor"
          transform={`rotate(${a} 10 10)`}
        />
      ))}
    </svg>
  );
}
export function MoonGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="theme-glyph">
      <path d="M13.6 15.4A6.6 6.6 0 0 1 8.2 3.3a7 7 0 1 0 8.6 9.4 6.6 6.6 0 0 1-3.2 2.7Z" fill="currentColor" />
      <path d="M14.6 3.2l.45 1.15 1.15.45-1.15.45-.45 1.15-.45-1.15L13 4.8l1.15-.45Z" fill="currentColor" />
      <circle cx="17" cy="8.4" r=".8" fill="currentColor" />
    </svg>
  );
}
