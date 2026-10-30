import { ItemMarketLink } from "@/components/item-market-link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ItemIcon } from "@/components/item-icon";
import { gameRecipesForOutput, itemWeight } from "@/lib/albion/game/server-recipes";
import { catalogItem } from "@/lib/catalog/validation";
import Link from "@/components/build-region-link";
import "@/components/economy-workspaces.css";
export default async function Item({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.itemMetadata.findUnique({ where: { id }, include: { release: true } });
  if (!item || !item.active) notFound();
  const metadata = catalogItem.parse(item);
  const itemRecipes = gameRecipesForOutput(id);
  const recipe = itemRecipes[0];
  const weight = itemWeight(id);
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
            <p>
              Weight:{" "}
              <strong className="numeric">
                {weight === null ? "Unavailable" : `${weight} kg`}
              </strong>
            </p>
            <code>{id}</code>
          </div>
          <ItemMarketLink id={id} />
        </div>
        <p className="item-data-notice">
          Item values and unlocks may change with game updates. Confirm your setup in game.
        </p>
        <nav className="item-section-nav" aria-label="Item sections">
          <a href="#item-abilities-heading">Abilities</a>
          {recipe && <a href="#item-recipe-heading">Crafting</a>}
          <Link href={`/tools/market?item=${encodeURIComponent(id)}`}>Market prices</Link>
        </nav>
        <section className="item-abilities" aria-labelledby="item-abilities-heading">
          <h2 id="item-abilities-heading">Abilities</h2>
          <p className="muted">
            Available ability choices. Unlock requirements are shown when known.
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
          {!metadata.abilities.length && <p>Ability details are unavailable for this item.</p>}
        </section>
        {recipe && (
          <section className="item-supported-recipe" aria-labelledby="item-recipe-heading">
            <h2 id="item-recipe-heading">
              {itemRecipes.length > 1 ? `Recipes (${itemRecipes.length} options)` : "Recipe"}
            </h2>
            <p>
              {recipe.outputCount} output per craft
              {recipe.baseFocus ? ` · ${recipe.baseFocus.toLocaleString("en-US")} base focus` : ""}
              {recipe.silver ? ` · ${recipe.silver.toLocaleString("en-US")} silver` : ""}. From game
              item data captured 27 Oct 2026; confirm in game after a patch.
            </p>
            {itemRecipes.map((option) => (
              <div key={option.id} className="item-recipe-option">
                {itemRecipes.length > 1 && <h3>Option {option.alternative}</h3>}
                <ul>
                  {option.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>
                      <ItemIcon id={ingredient.id} size={36} />
                      <span>
                        {ingredient.name}
                        {ingredient.returnable === false && <small> · not returned</small>}
                      </span>
                      <strong>× {ingredient.quantity}</strong>
                    </li>
                  ))}
                </ul>
                <Link
                  className="button secondary"
                  href={`/tools/${option.category || option.kind}?recipe=${encodeURIComponent(option.id)}`}
                >
                  Calculate{" "}
                  {itemRecipes.length > 1 ? `option ${option.alternative}` : "this recipe"}
                </Link>
              </div>
            ))}
          </section>
        )}
      </section>
    </div>
  );
}
