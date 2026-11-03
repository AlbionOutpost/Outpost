import { expect, type Locator } from "@playwright/test";

/** Read the user-facing number labels, excluding NumberFlow's inert 0–9 animation strips.
 * Expected arithmetic stays independent; rendered glyphs and motion have separate visual checks.
 */
export async function expectResultText(
  locator: Locator,
  expected: string | RegExp,
  { exact = false, not = false }: { exact?: boolean; not?: boolean } = {},
) {
  const actual = expect.poll(() =>
    locator.evaluate((element) => {
      const copy = element.cloneNode(true) as HTMLElement;
      const numbers = [...copy.querySelectorAll<HTMLElement>(".animated-number")];
      if (copy.matches(".animated-number")) numbers.unshift(copy);
      for (const number of numbers) number.textContent = number.getAttribute("aria-label") ?? "";
      return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
    }),
  );
  const assertion = not ? actual.not : actual;
  if (expected instanceof RegExp) await assertion.toMatch(expected);
  else if (exact) await assertion.toBe(expected.replace(/\s+/g, " ").trim());
  else await assertion.toContain(expected);
}
