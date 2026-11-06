import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { PanelHead } from "@/components/panel-head";
import { ReferenceJump } from "@/components/reference-jump";
import { CalculatorCta } from "@/components/calculator-cta";
import { cities } from "@/lib/albion/region-config";
import referenceTables from "@/lib/albion/game/reference-tables.json" with { type: "json" };
import styles from "@/components/calculator-shell.module.css";
import r from "./reference.module.css";
type Table = { heading: string | null; header: string[]; rows: string[][] };
/**
 * The source mixes "Fast (115%)" with a bare "50%" in one Speed column. Split it into the figure
 * and its class so every row lines up; a class the source doesn't give stays empty.
 */
function normalise(slug: string, table: Table): Table {
  if (slug !== "riding-mount-speed") return table;
  const at = table.header.indexOf("Speed");
  if (at < 0) return table;
  return {
    ...table,
    header: [...table.header.slice(0, at), "Speed", "Speed class", ...table.header.slice(at + 1)],
    rows: table.rows.map((row) => {
      const m = /^(.*?)\s*\((\d+%)\)$/.exec(row[at]) ?? [row[at], "", row[at]];
      return [...row.slice(0, at), m[2], m[1], ...row.slice(at + 1)];
    }),
  };
}
const tables = (referenceTables as { slug: string; title: string; tables: Table[] }[]).map((t) => ({
  ...t,
  tables: t.tables.map((table) => normalise(t.slug, table)),
}));
const numeric = /^[\d.,%\s–+-]+(kg|%)?$/;
const cityNames = new Set<string>(cities);
/** "Two Handed Weapon" → "Two-handed weapon"; city names keep their capitals. */
function sentence(text: string) {
  const kept: string[] = [];
  let out = text
    .replace(/(F|f)avorite/g, "$1avourite")
    .replace(/\b(One|Two) Handed\b/g, "$1-handed");
  for (const city of cityNames)
    out = out.replaceAll(city, () => `\u0000${kept.push(city) - 1}\u0000`);
  out = out.replace(/ ([A-Z])(?=[a-z])/g, (_, first: string) => ` ${first.toLowerCase()}`);
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => kept[Number(i)]);
}
function Cell({ value }: { value: string }) {
  // An empty source cell: nothing given for this row (no bonus, no speed class)
  if (!value)
    return (
      <span className={r.none}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">None</span>
      </span>
    );
  if (cityNames.has(value))
    return (
      <span className={r.city}>
        <span className="city-dot" data-city={value} aria-hidden="true" />
        {value}
      </span>
    );
  return <>{value}</>;
}
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/tools/reference", await searchParams);
}
export default function Page() {
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="reference"
        scene="economy"
        title="Reference tables"
        accent="Reference"
        description="City bonuses, laborer happiness, crafting fame, mounts, islands, banks and attunement traits in one place."
      />
      <div className={r.layout}>
        <nav className={`panel ${r.rail}`} aria-label="Reference tables">
          <PanelHead title="Tables" line="Captured from the game on 27 Oct 2026." as="h2" />
          <ReferenceJump className={r.jump} sections={tables} />
          <ul className={r.index}>
            {tables.map((t) => (
              <li key={t.slug}>
                <a href={`#${t.slug}`}>{sentence(t.title)}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={r.sections}>
          {tables.map((t) => (
            <section
              key={t.slug}
              id={t.slug}
              tabIndex={-1}
              className={`panel ${r.section}`}
              aria-labelledby={`${t.slug}-title`}
            >
              <PanelHead
                id={`${t.slug}-title`}
                title={sentence(t.title)}
                line={
                  t.tables.length > 1
                    ? `${t.tables.length} tables`
                    : `${t.tables[0].rows.length} ${t.tables[0].rows.length === 1 ? "row" : "rows"}`
                }
              />
              {t.tables.map((table, index) => (
                <div key={index} className={r.block}>
                  {table.heading && t.tables.length > 1 && <h3>{sentence(table.heading)}</h3>}
                  <div
                    className={r.scroll}
                    tabIndex={0}
                    role="region"
                    aria-label={table.heading ?? t.title}
                  >
                    <table className={r.table}>
                      <thead>
                        <tr>
                          {table.header.map((cell, i) => (
                            <th
                              key={i}
                              scope="col"
                              className={
                                i > 0 && table.rows.every((row) => !row[i] || numeric.test(row[i]))
                                  ? r.numeric
                                  : undefined
                              }
                            >
                              {cell ? sentence(cell) : <span className="sr-only">Type</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, c) =>
                              c === 0 ? (
                                <th key={c} scope="row">
                                  <Cell value={cell} />
                                </th>
                              ) : (
                                <td key={c} className={numeric.test(cell) ? r.numeric : undefined}>
                                  <Cell value={cell} />
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          ))}
          <p className={styles.help}>
            Values change with patches. Check in game before a big investment.
          </p>
        </div>
      </div>
      <CalculatorCta
        title={
          <>
            Put the bonuses to <em>work</em>
          </>
        }
        line="Pick the city with the right bonus in the crafting or refining calculator and see what the run makes."
        primary={{ href: "/tools/crafting", label: "Open the crafting calculator" }}
        secondary={{ href: "/tools/refining", label: "Refining" }}
      />
    </div>
  );
}
