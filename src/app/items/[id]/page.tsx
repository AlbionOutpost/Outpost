import { ItemMarketLink } from "@/components/item-market-link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ItemIcon } from "@/components/item-icon";
import { catalogItem } from "@/lib/catalog/validation";
import Link from "next/link";
export default async function Item({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.itemMetadata.findUnique({ where: { id }, include: { release: true } });
  if (!item || !item.active) notFound();
  const metadata = catalogItem.parse(item);
  return (
    <div className="item-reference-page">
      <Link className="text-link item-back-link" href="/items">
        ← Item database
      </Link>
      <h1 className="page-title display-title">{item.name}</h1>
      <section className="panel item-metadata-detail">
        <div className="item-reference-summary">
          <ItemIcon id={id} size={96} />
          <div>
            <p className="item-reference-slot">
              {item.slot} · T{item.tier}.{item.enchantment}
            </p>
            <p>
              Base item power (IP):{" "}
              <strong className="numeric">{item.itemPower ?? "Not verified"}</strong>
            </p>
            <code>{id}</code>
          </div>
          <ItemMarketLink id={id} />
        </div>
        <p className="item-data-notice">
          Imported item data. Manual and current-patch verification are not recorded.
        </p>
        <section className="item-abilities" aria-labelledby="item-abilities-heading">
          <h2 id="item-abilities-heading">Imported abilities</h2>
          <p className="muted">
            Ability names from the imported release. Missing unlock requirements are not verified.
          </p>
          <div className="item-ability-groups">
            {[...new Set(metadata.abilities.map((ability) => ability.slot))].map((slot) => (
              <section key={slot} className="item-ability-group" aria-label={`${slot} abilities`}>
                <h3>{slot}</h3>
                <ul>
                  {metadata.abilities
                    .filter((ability) => ability.slot === slot)
                    .map((ability) => (
                      <li key={ability.id}>
                        <span>{ability.name}</span>
                        {ability.unlock && <small>Unlock: {ability.unlock}</small>}
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
          {!metadata.abilities.length && (
            <p>No ability data for this item in the imported release.</p>
          )}
        </section>
        <details className="item-provenance">
          <summary>Item data source & verification</summary>
          <p>
            Data status: source-imported and schema-validated. Manual verification: not recorded.
            Patch verification: not recorded.
          </p>
          <p>
            Release {item.release.version} · Imported {item.release.importedAt.toISOString()}
          </p>
          <a className="text-link" href={item.release.sourceUrl} rel="noreferrer" target="_blank">
            Source reference
          </a>
          <p>{item.release.rightsReference}</p>
        </details>
      </section>
    </div>
  );
}
