import { WorkspaceHeading } from "@/components/workspace-heading";
import { MastheadTabs } from "@/components/masthead-tabs";
import BackLink from "@/components/build-region-link";
import { ArrowLeft } from "lucide-react";
import { ItemMarketLink } from "@/components/item-market-link";
import { ItemPricePanel } from "@/components/item-price-panel";
import { BuildPreviewCard } from "@/components/build-preview-card";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ItemIcon } from "@/components/item-icon";
import {
  gameRecipesForOutput,
  gameRecipesUsing,
  itemWeight,
} from "@/lib/albion/game/server-recipes";
import { catalogItem } from "@/lib/catalog/validation";
import { findEquipment } from "@/lib/albion/equipment-catalog";
import { buildDiscovery } from "@/lib/build-discovery";
import { listAccountBuilds } from "@/lib/builds/discovery-service";
import Link from "@/components/build-region-link";
import "@/components/economy-workspaces.css";

/** Every tier and enchantment this item id could take; the catalog decides which exist. */
function variantIds(id: string) {
  const match = /^T([1-8])_(.+?)(?:@([1-4]))?$/.exec(id);
  if (!match) return [];
  const ids: string[] = [];
  for (let tier = 1; tier <= 8; tier++)
    for (let enchantment = 0; enchantment <= 4; enchantment++)
      ids.push(`T${tier}_${match[2]}${enchantment ? `@${enchantment}` : ""}`);
  return ids;
}

/** Route params keep percent-encoding, so an enchanted id arrives as `T4_MAIN_AXE%401`. */
async function itemId(params: Promise<{ id: string }>) {
  const { id } = await params;
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = await itemId(params);
  const item = await db.itemMetadata.findUnique({ where: { id }, select: { name: true } });
  return { title: item ? `${item.name} · Item` : "Item" };
}

export default async function Item({ params }: { params: Promise<{ id: string }> }) {
  const id = await itemId(params);
  const item = await db.itemMetadata.findUnique({ where: { id }, include: { release: true } });
  if (!item || !item.active) notFound();
  const metadata = catalogItem.parse(item);
  const itemRecipes = gameRecipesForOutput(id);
  const recipe = itemRecipes[0];
  const weight = itemWeight(id);
  const usedIn = gameRecipesUsing(id, 12);
  const candidates = variantIds(id);
  const variants = candidates.length
    ? await db.itemMetadata.findMany({
        where: { id: { in: candidates }, active: true },
        select: { id: true, tier: true, enchantment: true, itemPower: true },
        orderBy: [{ tier: "asc" }, { enchantment: "asc" }],
      })
    : [];
  const equipment = findEquipment(id);
  const weaponCode =
    equipment && buildDiscovery.weapons.some((weapon) => weapon.code === equipment.family.code)
      ? equipment.family.code
      : "";
  const session = weaponCode ? await getServerSession(authOptions) : null;
  const builds = weaponCode
    ? await listAccountBuilds(session?.user?.id || null, {
        q: "",
        mine: false,
        content: "",
        codes: [weaponCode],
        sort: "saved",
        page: 1,
      })
    : null;
  const tiers = [...new Set(variants.map((variant) => variant.tier))];
  // Only equipment has a catalog page; resources and ingredients are named without a link.
  const linkable = new Set(
    (
      await db.itemMetadata.findMany({
        where: {
          id: {
            in: [
              ...new Set([
                ...itemRecipes.flatMap((option) => option.ingredients.map((i) => i.id)),
                ...usedIn.recipes.map((option) => option.output),
              ]),
            ],
          },
          active: true,
        },
        select: { id: true },
      })
    ).map((row) => row.id),
  );
  const ItemName = ({ id: target, children }: { id: string; children: React.ReactNode }) =>
    linkable.has(target) ? (
      <Link className="item-inline-link" href={`/items/${target}`}>
        {children}
      </Link>
    ) : (
      <span className="item-inline-name">{children}</span>
    );
  return (
    <div className="item-reference-page">
      <WorkspaceHeading
        scene="market"
        emblem={<ItemIcon id={id} size={56} />}
        title={item.name}
        description={`${item.slot} · T${item.tier}.${item.enchantment} · Base item power ${item.itemPower ?? "not verified"} · Weight ${weight === null ? "unavailable" : `${weight} kg`}`}
        actions={<ItemMarketLink id={id} />}
      >
        <MastheadTabs
          label="Item sections"
          tabs={[
            { href: "#item-prices-heading", label: "Market prices", anchor: true },
            { href: "#item-abilities-heading", label: "Abilities", anchor: true },
            ...(recipe ? [{ href: "#item-recipe-heading", label: "Crafting", anchor: true }] : []),
            ...(variants.length > 1
              ? [{ href: "#item-variants-heading", label: "Tiers & enchantments", anchor: true }]
              : []),
            ...(usedIn.total > 0
              ? [{ href: "#item-used-in-heading", label: "Used in", anchor: true }]
              : []),
            ...(builds && builds.total > 0
              ? [{ href: "#item-builds-heading", label: "Builds", anchor: true }]
              : []),
          ]}
        />
        <p className="masthead-note">
          <code>{id}</code> · Item values and unlocks may change with game updates. Confirm your
          setup in game.
        </p>
        <BackLink className="pill-link is-small masthead-back" href="/items">
          Item database <ArrowLeft size={14} />
        </BackLink>
      </WorkspaceHeading>
      <section className="panel item-metadata-detail">
        <ItemPricePanel id={id} />
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
                      <ItemName id={ingredient.id}>
                        {ingredient.name}
                        {ingredient.returnable === false && <small> · not returned</small>}
                      </ItemName>
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
        {variants.length > 1 && (
          <section className="item-variants" aria-labelledby="item-variants-heading">
            <h2 id="item-variants-heading">Tiers &amp; enchantments</h2>
            <p className="muted">
              Every version of this item in the catalog. Base IP is the unenchanted, normal-quality
              value.
            </p>
            <div className="table-scroll" role="region" aria-label="Item variants" tabIndex={0}>
              <table className="item-variant-table">
                <thead>
                  <tr>
                    <th scope="col">Tier</th>
                    {[0, 1, 2, 3, 4].map((enchantment) => (
                      <th scope="col" key={enchantment}>
                        .{enchantment}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => (
                    <tr key={tier}>
                      <th scope="row">T{tier}</th>
                      {[0, 1, 2, 3, 4].map((enchantment) => {
                        const variant = variants.find(
                          (candidate) =>
                            candidate.tier === tier && candidate.enchantment === enchantment,
                        );
                        if (!variant)
                          return (
                            <td key={enchantment} className="muted">
                              —
                            </td>
                          );
                        const current = variant.id === id;
                        return (
                          <td key={enchantment}>
                            <Link
                              className={`item-variant-link${current ? " is-current" : ""}`}
                              href={`/items/${variant.id}`}
                              aria-current={current ? "page" : undefined}
                            >
                              <ItemIcon id={variant.id} size={32} />
                              <span className="numeric">
                                {variant.itemPower ?? "—"}
                                <small>IP</small>
                              </span>
                            </Link>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {usedIn.total > 0 && (
          <section className="item-used-in" aria-labelledby="item-used-in-heading">
            <h2 id="item-used-in-heading">Used in {usedIn.total} recipes</h2>
            <p className="muted">
              Crafts that consume this item.{" "}
              {usedIn.total > usedIn.recipes.length
                ? `Showing the first ${usedIn.recipes.length}.`
                : ""}
            </p>
            <ul className="item-used-in-list">
              {usedIn.recipes.map((option) => {
                const quantity =
                  option.ingredients.find((ingredient) => ingredient.id === id)?.quantity ?? 0;
                return (
                  <li key={option.id}>
                    <ItemIcon id={option.output} size={36} />
                    <ItemName id={option.output}>{option.name}</ItemName>
                    <span className="muted">× {quantity} per craft</span>
                    <Link
                      className="text-link"
                      href={`/tools/${option.category || option.kind}?recipe=${encodeURIComponent(option.id)}`}
                    >
                      Calculate →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {builds && builds.total > 0 && (
          <section className="item-builds" aria-labelledby="item-builds-heading">
            <div className="item-price-heading">
              <div>
                <h2 id="item-builds-heading">
                  {builds.total} public {builds.total === 1 ? "build uses" : "builds use"} this
                  weapon
                </h2>
                <p className="muted">Most saved first, any tier or enchantment.</p>
              </div>
              <Link className="button secondary" href={`/builds?weapon=${weaponCode}`}>
                See all builds
              </Link>
            </div>
            <div className="build-grid item-build-grid">
              {builds.builds.slice(0, 3).map((build) => (
                <BuildPreviewCard
                  key={build.id}
                  build={build}
                  authenticated={!!session?.user?.id}
                  saved={build.favorites.length > 0}
                  favoriteCount={build._count.favorites}
                  owned={build.authorId === session?.user?.id}
                />
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
