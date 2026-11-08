import "@/app/build-styles";
import { itemShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import marketPage from "@/components/market-page.module.css";
import { MastheadTabs } from "@/components/masthead-tabs";
import BackLink from "@/components/build-region-link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ItemMarketLink } from "@/components/item-market-link";
import { ItemPricePanel } from "@/components/item-price-panel";
import { CommunityBuildCard } from "@/components/community-build-card";
import { LibraryBuildCard } from "@/components/library-build-card";
import { queryLibraryBuilds } from "@/lib/grind-library";
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
import { catalogVariants } from "@/lib/catalog/item-search";
import { findEquipment } from "@/lib/albion/equipment-catalog";
import { itemAbilities } from "@/lib/albion/equipment-abilities";
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
  const variants = await catalogVariants(id);
  const equipment = findEquipment(id);
  // The weapon as /builds names it, so the count here is the count behind "See all".
  const weapon = equipment
    ? buildDiscovery.weapons.find((entry) => entry.code === equipment.family.code)
    : undefined;
  const session = weapon ? await getServerSession(authOptions) : null;
  const viewer = session?.user?.id || null;
  const [players, library] = weapon
    ? await Promise.all([
        listAccountBuilds(viewer, {
          q: "",
          mine: false,
          content: "",
          codes: [weapon.code],
          sort: "saved",
          page: 1,
        }),
        queryLibraryBuilds({ weapon: weapon.name, page: 1 }),
      ])
    : [null, null];
  const buildTotal = (players?.total ?? 0) + (library?.matched ?? 0);
  // Like /builds "All": community builds first, then the library, three windows in all.
  const shownPlayers = players?.builds.slice(0, 3) ?? [];
  const shownLibrary = library?.rows.slice(0, 3 - shownPlayers.length) ?? [];
  const abilities = itemAbilities(id, metadata.abilities);
  const abilitySources = new Set(abilities.map((ability) => ability.source));
  const tiers = [...new Set(variants.map((variant) => variant.tier))];
  // Tiers without enchanted versions (usually T1–T3) sit above the grid instead of padding it with dashes
  const enchantedTiers = tiers.filter((tier) =>
    variants.some((variant) => variant.tier === tier && variant.enchantment > 0),
  );
  const plainTiers = enchantedTiers.length ? tiers.filter((t) => !enchantedTiers.includes(t)) : [];
  const gridTiers = enchantedTiers.length ? enchantedTiers : tiers;
  const variantLink = (variant: (typeof variants)[number]) => {
    const current = variant.id === id;
    return (
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
    );
  };
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
    <div className={`item-reference-page ${marketPage.page}`}>
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
            ...(buildTotal > 0
              ? [{ href: "#item-builds-heading", label: "Builds", anchor: true }]
              : []),
          ]}
        />
        <div className="item-masthead-row">
          <BackLink className="pill-link is-small masthead-back" href="/items">
            <ArrowLeft size={14} aria-hidden="true" /> Item database
          </BackLink>
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
            line={
              abilitySources.size === 2
                ? "Every ability recorded for each slot: the July 2026 item snapshot, plus the archived build library where marked. Confirm in game."
                : abilitySources.has("archive")
                  ? "Every ability recorded for each slot in the archived build library, the list the build editor offers. Historical; confirm in game."
                  : "Every ability you can pick for each slot, from the July 2026 item snapshot. Unlock requirements show when known."
            }
          />
          {abilities.length ? (
            <div className="item-ability-columns">
              {[...new Set(abilities.map((ability) => ability.slot))].map((slot) => (
                <section
                  key={slot}
                  className="item-ability-column"
                  aria-label={`${slot} abilities`}
                >
                  <h3>
                    <span className="item-slot-key">{slot}</span>
                  </h3>
                  <ul>
                    {abilities
                      .filter((ability) => ability.slot === slot)
                      .map((ability) => (
                        <li key={ability.id}>
                          <span className="item-spell-well">
                            <SpellIcon id={ability.id} name={ability.name} size={36} />
                          </span>
                          <span>
                            {ability.name}
                            {ability.unlock && <small>Unlock: {ability.unlock}</small>}
                            {abilitySources.size === 2 && ability.source === "archive" && (
                              <small>Archived build library</small>
                            )}
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
              line="Neither the item snapshot nor the archived build library records its spells. Check them in game."
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
            {plainTiers.length > 0 && (
              <div className="item-variant-plain">
                <p>
                  T{plainTiers[0]}
                  {plainTiers.length > 1 ? `–T${plainTiers[plainTiers.length - 1]}` : ""} have no
                  enchanted versions.
                </p>
                <ul>
                  {plainTiers.map((tier) => {
                    const variant = variants.find((v) => v.tier === tier && v.enchantment === 0);
                    return variant ? (
                      <li key={tier}>
                        <span>T{tier}</span>
                        {variantLink(variant)}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            )}
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
                  {gridTiers.map((tier) => (
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
                        return <td key={enchantment}>{variantLink(variant)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ItemVariantPicker className="item-variant-picker" variants={variants} current={id} />
          </section>
        )}
        {weapon && buildTotal > 0 && (
          <section className="item-builds" aria-labelledby="item-builds-heading">
            <SectionHeading
              id="item-builds-heading"
              title={
                <>
                  {buildTotal.toLocaleString("en-GB")}{" "}
                  <em>{buildTotal === 1 ? "build" : "builds"}</em>{" "}
                  {buildTotal === 1 ? "uses" : "use"} the {weapon.name}
                </>
              }
              line={`${(players?.total ?? 0).toLocaleString("en-GB")} community · ${(library?.matched ?? 0).toLocaleString("en-GB")} library · any tier or enchantment, most saved first.`}
              link={{
                href: `/builds?weapon=${encodeURIComponent(weapon.name)}`,
                label: `See all ${buildTotal.toLocaleString("en-GB")}`,
              }}
            />
            <div className="build-grid item-build-grid">
              {shownPlayers.map((build) => (
                <CommunityBuildCard
                  key={build.id}
                  build={build}
                  authenticated={!!viewer}
                  saved={build.favorites.length > 0}
                  favoriteCount={build._count.favorites}
                  owned={build.authorId === viewer}
                />
              ))}
              {shownLibrary.map((build) => (
                <LibraryBuildCard key={build.id} build={build} />
              ))}
            </div>
          </section>
        )}
      </div>
      <MarketNextSteps show={["flipping", "crafting", "planner"]} />
    </div>
  );
}
