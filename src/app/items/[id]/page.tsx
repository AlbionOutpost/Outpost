import "@/app/build-styles";
import { itemShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { MastheadTabs } from "@/components/masthead-tabs";
import BackLink from "@/components/build-region-link";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
import "./item-detail.css";
import { PanelHead } from "@/components/panel-head";
import { SectionHeading } from "@/components/section-heading";
import { EmptyWell } from "@/components/empty-well";
import { SpellIcon } from "@/components/spell-icon";
import { ItemVariantPicker } from "@/components/item-variant-picker";
import { MarketNextSteps } from "@/components/market-next-steps";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbList } from "@/lib/structured-data";

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

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SeoQuery>;
}) {
  return itemShareMetadata((await params).id, await searchParams);
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
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Items", path: "/items" },
          { name: item.name, path: `/items/${encodeURIComponent(id)}` },
        ])}
      />
      <WorkspaceHeading
        scene="market"
        emblem={<ItemIcon id={id} size={56} />}
        title={item.name}
        description={`${item.slot} · T${item.tier}.${item.enchantment} · Base item power ${item.itemPower ?? "not verified"} · ${weight === null ? "Weight unavailable" : `${weight} kg`}`}
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
        <div className="item-masthead-row">
          <BackLink className="pill-link is-small masthead-back" href="/items">
            <ArrowLeft size={14} aria-hidden="true" /> Item database
          </BackLink>
          <code className="item-id-chip">{id}</code>
          <ItemMarketLink id={id} />
        </div>
      </WorkspaceHeading>
      <div className="item-metadata-detail">
        <ItemPricePanel id={id} name={item.name} />
        <section
          className="raised item-panel item-abilities"
          aria-labelledby="item-abilities-heading"
        >
          <PanelHead
            id="item-abilities-heading"
            title="Abilities"
            line="Every ability you can pick for each slot. Unlock requirements show when known."
          />
          {metadata.abilities.length ? (
            <div className="item-ability-columns">
              {[...new Set(metadata.abilities.map((ability) => ability.slot))].map((slot) => (
                <section
                  key={slot}
                  className="item-ability-column"
                  aria-label={`${slot} abilities`}
                >
                  <h3>
                    <span className="item-slot-key">{slot}</span>
                  </h3>
                  <ul>
                    {metadata.abilities
                      .filter((ability) => ability.slot === slot)
                      .map((ability) => (
                        <li key={ability.id}>
                          <span className="item-spell-well">
                            <SpellIcon id={ability.id} name={ability.name} size={36} />
                          </span>
                          <span>
                            {ability.name}
                            {ability.unlock && <small>Unlock: {ability.unlock}</small>}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <EmptyWell
              title="No ability list for this item"
              line="Check the item's spells in game; they have not been recorded here yet."
            />
          )}
        </section>
        {recipe && (
          <section
            className="raised item-panel item-supported-recipe"
            aria-labelledby="item-recipe-heading"
          >
            <PanelHead
              id="item-recipe-heading"
              title={itemRecipes.length > 1 ? `Recipes (${itemRecipes.length} options)` : "Recipe"}
              line={`${recipe.outputCount} per craft${recipe.baseFocus ? ` · ${recipe.baseFocus.toLocaleString("en-US")} base focus` : ""}${recipe.silver ? ` · ${recipe.silver.toLocaleString("en-US")} silver` : ""} · game data from 27 Oct 2026`}
            />
            {itemRecipes.map((option) => (
              <div key={option.id} className="item-recipe-option">
                {itemRecipes.length > 1 && <h3>Option {option.alternative}</h3>}
                <ul>
                  {option.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>
                      <span className="item-row-well">
                        <ItemIcon id={ingredient.id} size={36} />
                      </span>
                      <ItemName id={ingredient.id}>
                        {ingredient.name}
                        {ingredient.returnable === false && <small>Not returned</small>}
                      </ItemName>
                      <strong className="numeric">× {ingredient.quantity}</strong>
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
        {usedIn.total > 0 && (
          <section
            className="raised item-panel item-used-in"
            aria-labelledby="item-used-in-heading"
          >
            <PanelHead
              id="item-used-in-heading"
              title={`Used in ${usedIn.total} recipes`}
              line={
                usedIn.total > usedIn.recipes.length
                  ? `Crafts that use this item. The first ${usedIn.recipes.length} are shown.`
                  : "Crafts that use this item."
              }
            />
            <ul className="item-used-in-list">
              {usedIn.recipes.map((option) => {
                const quantity =
                  option.ingredients.find((ingredient) => ingredient.id === id)?.quantity ?? 0;
                return (
                  <li key={option.id}>
                    <span className="item-row-well">
                      <ItemIcon id={option.output} size={36} />
                    </span>
                    <span className="item-used-in-name">
                      <ItemName id={option.output}>{option.name}</ItemName>
                      <small>× {quantity} per craft</small>
                    </span>
                    <Link
                      className="pill-link is-small"
                      href={`/tools/${option.category || option.kind}?recipe=${encodeURIComponent(option.id)}`}
                      aria-label={`Calculate ${option.name}`}
                    >
                      Calculate <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {variants.length > 1 && (
          <section
            className="raised item-panel item-variants"
            aria-labelledby="item-variants-heading"
          >
            <PanelHead
              id="item-variants-heading"
              title="Tiers & enchantments"
              line="Every version in the catalog, with its base IP at normal quality. Values can change with a game update."
            />
            <div
              className="table-scroll item-variant-well"
              role="region"
              aria-label="Item variants"
              tabIndex={0}
            >
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
            <ItemVariantPicker variants={variants} current={id} />
          </section>
        )}
        {builds && builds.total > 0 && (
          <section className="item-builds" aria-labelledby="item-builds-heading">
            <SectionHeading
              id="item-builds-heading"
              title={
                <>
                  {builds.total} public <em>{builds.total === 1 ? "build" : "builds"}</em>{" "}
                  {builds.total === 1 ? "uses" : "use"} this weapon
                </>
              }
              line="Most saved first, any tier or enchantment."
              link={{ href: `/builds?weapon=${weaponCode}`, label: "See all builds" }}
            />
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
      </div>
      <MarketNextSteps show={["flipping", "crafting", "planner"]} />
    </div>
  );
}
