import { WorkspaceHeading } from "@/components/workspace-heading";
import referenceTables from "@/lib/albion/game/reference-tables.json" with { type: "json" };
import "@/app/tool-workspace.css";
export const metadata = { title: "Reference tables" };
type Table = { heading: string | null; header: string[]; rows: string[][] };
const tables = referenceTables as { slug: string; title: string; tables: Table[] }[];
const numeric = /^[\d.,%\s–-]+(kg|%)?$/;
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        glyph="reference"
        scene="economy"
        title="Reference tables"
        description="City bonuses, laborer happiness, crafting fame, mounts, islands, banks and attunement traits."
      />
      <nav className="reference-index" aria-label="Reference tables">
        {tables.map((t) => (
          <a key={t.slug} href={`#${t.slug}`}>
            {t.title}
          </a>
        ))}
      </nav>
      <p className="muted reference-note">
        Game reference data captured 27 Oct 2026. Values can change with a patch; confirm in game
        before large investments.
      </p>
      <div className="reference-sections">
        {tables.map((t) => (
          <section key={t.slug} id={t.slug} className="panel" aria-labelledby={`${t.slug}-title`}>
            <h2 id={`${t.slug}-title`}>{t.title}</h2>
            {t.tables.map((table, index) => (
              <div key={index} className="reference-block">
                {table.heading && t.tables.length > 1 && <h3>{table.heading}</h3>}
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label={table.heading ?? t.title}
                >
                  <table className="tool-table">
                    <thead>
                      <tr>
                        {table.header.map((cell, i) => (
                          <th key={i} scope="col">
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) =>
                            c === 0 ? (
                              <th key={c} scope="row">
                                {cell}
                              </th>
                            ) : (
                              <td key={c} className={numeric.test(cell) ? "numeric" : undefined}>
                                {cell || "—"}
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
      </div>
    </>
  );
}
