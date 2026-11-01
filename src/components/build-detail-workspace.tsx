"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, CircleHelp, Layers, Swords } from "lucide-react";
import Link from "./link";
import { useAtlasRegion } from "./region-context";
import { InventoryEquipmentBoard, type InventoryEquipmentItem } from "./inventory-equipment-board";
import { ItemIcon } from "./item-icon";
import { SpellIcon } from "./spell-icon";
export type PresentedBuildEquipment = InventoryEquipmentItem & {
  name: string;
  qualityLabel: string;
  abilityNotes: string;
  alternativeNotes: string;
  alternateItems: { id: string; name: string; spells: { id: string; name: string }[] }[];
};
export type BuildDetailInformation = {
  activity?: string;
  author?: string;
  updatedAt?: string;
  version?: number;
  playerCount?: number;
  recommendedIP?: number;
  visibility?: string;
  tags?: string[];
};
const slots = [
  "Main hand",
  "Off hand",
  "Helmet",
  "Chest",
  "Boots",
  "Cape",
  "Bag",
  "Mount",
  "Food",
  "Potion",
];
function AbilityGroup({
  item,
  selected = false,
}: {
  item: PresentedBuildEquipment;
  selected?: boolean;
}) {
  return (
    <article
      className={`loadout-ability-row detail-ability-item${selected ? " is-selected" : ""}`}
      data-slot={item.slot}
    >
      <div className="detail-ability-heading">
        <ItemIcon id={item.itemId} quality={item.quality} size={36} />
        <div>
          <span className="loadout-slot-label">{item.slot}</span>
          <h3>{selected ? "Abilities & passives" : item.name}</h3>
        </div>
      </div>
      {item.spells?.length ? (
        <div
          className="detail-spell-grid"
          aria-label={`${item.slot}${selected ? "" : " overview"} recorded abilities`}
        >
          {item.spells.map((spell, i) => (
            <div className="detail-spell-choice" key={`${spell.id || spell.name}-${i}`}>
              <small>{spell.key || "Ability"}</small>
              {spell.id ? (
                <SpellIcon id={spell.id} name={spell.name} size={38} />
              ) : (
                <CircleHelp size={30} aria-hidden="true" />
              )}
              <span>{spell.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="detail-muted">No ability selections specified for this item.</p>
      )}
      {item.abilityNotes && (
        <p className="preserve detail-item-note">Ability notes: {item.abilityNotes}</p>
      )}
      {item.alternativeNotes && (
        <p className="preserve detail-item-note">Alternative notes: {item.alternativeNotes}</p>
      )}
    </article>
  );
}
export function BuildDetailWorkspace({
  equipment,
  region: sourceRegion,
  information,
  recommendations,
  extraActions,
}: {
  equipment: PresentedBuildEquipment[];
  region?: string;
  information?: BuildDetailInformation;
  recommendations?: ReactNode;
  extraActions?: ReactNode;
}) {
  const alternativePrefix = useId();
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  function inspectSlot(slot: string) {
    setSelectedSlot(slot);
    if (window.matchMedia("(max-width: 700px)").matches) {
      requestAnimationFrame(() => {
        inspectorHeading.current?.focus({ preventScroll: true });
        inspectorHeading.current?.scrollIntoView({ block: "start", behavior: "instant" });
      });
    }
  }
  const viewerRegion = useAtlasRegion(),
    region = viewerRegion;
  const [selectedSlot, setSelectedSlot] = useState(
    equipment.find((item) => item.slot === "Main hand")?.slot || equipment[0]?.slot || "Helmet",
  );
  const selected = equipment.find((item) => item.slot === selectedSlot);
  const ordered = [...equipment].sort(
    (a, b) =>
      (slots.indexOf(a.slot) < 0 ? 99 : slots.indexOf(a.slot)) -
      (slots.indexOf(b.slot) < 0 ? 99 : slots.indexOf(b.slot)),
  );
  const alternatives = ordered.filter((item) => item.alternateItems.length);
  const activeAlternative =
    alternatives.find((item) => item.slot === selectedSlot)?.slot || alternatives[0]?.slot;
  const alternativeTabId = (slot: string) => `${alternativePrefix}-${slot.replaceAll(" ", "-")}`;
  const spellCount = equipment.reduce((sum, item) => sum + (item.spells?.length || 0), 0);
  const altCount = equipment.reduce((sum, item) => sum + item.alternateItems.length, 0);
  useEffect(() => {
    const followSlot = () => {
      let hash = "";
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const prefix = hash.startsWith("build-gear-")
        ? "build-gear-"
        : hash.startsWith("build-alternatives-")
          ? "build-alternatives-"
          : undefined;
      if (prefix) {
        const slot = hash.slice(prefix.length).replaceAll("-", " ");
        if (slots.includes(slot)) setSelectedSlot(slot);
      }
    };
    const frame = requestAnimationFrame(followSlot);
    window.addEventListener("hashchange", followSlot);
    window.addEventListener("popstate", followSlot);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", followSlot);
      window.removeEventListener("popstate", followSlot);
    };
  }, []);
  return (
    <section
      className="build-loadout-view detail-workspace"
      id="build-equipment"
      aria-label="Build equipment and abilities"
      data-selected-slot={selectedSlot}
    >
      <div className="detail-workspace-grid">
        <aside className="raised detail-build-context" aria-label="Build information">
          <h2>Build information</h2>
          <dl className="detail-facts">
            {information?.activity && (
              <div>
                <dt>Content</dt>
                <dd>{information.activity}</dd>
              </div>
            )}
            {information?.author && (
              <div>
                <dt>Author</dt>
                <dd>{information.author}</dd>
              </div>
            )}
            <div>
              <dt>Market region</dt>
              <dd className="detail-capitalize">{region}</dd>
            </div>
            {sourceRegion && (
              <div>
                <dt>Build server</dt>
                <dd className="detail-capitalize">{sourceRegion}</dd>
              </div>
            )}
            {information?.updatedAt && (
              <div>
                <dt>Updated</dt>
                <dd>{information.updatedAt.slice(0, 10)}</dd>
              </div>
            )}
          </dl>
          <div className="detail-context-completeness">
            <strong>
              {equipment.length}
              <small>/10</small>
            </strong>
            <span>Equipped slots</span>
          </div>
          <p>{spellCount} recorded ability selections</p>
          <p>{altCount} configured alternatives</p>
          {information?.recommendedIP ? <p>Author IP target: {information.recommendedIP}</p> : null}
          {!!information?.tags?.length && (
            <div className="detail-context-tags">
              {information.tags.slice(0, 6).map((tag, i) => (
                <span key={`${tag}-${i}`} title="Author tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <a className="button secondary" href="#build-cost">
            Check loadout cost
          </a>
        </aside>
        <section className="raised detail-inventory-panel" aria-label="Inventory loadout">
          <div className="detail-panel-heading">
            <h2>
              <Swords size={17} /> Equipment
            </h2>
            <span>{equipment.length}/10 equipped</span>
          </div>
          <InventoryEquipmentBoard
            equipment={equipment}
            selectedSlot={selectedSlot}
            onSelectSlot={inspectSlot}
            anchorPrefix="build-gear"
          />
          <p className="detail-inventory-hint">
            Select a slot to inspect its abilities and alternatives.
          </p>
        </section>
        <aside className="raised detail-summary-panel" aria-label="Build summary">
          <div className="detail-panel-heading">
            <h2 ref={inspectorHeading} tabIndex={-1}>
              {selectedSlot}
            </h2>
            <span>Selected equipment</span>
          </div>
          <div className="detail-selected-item" aria-live="polite">
            {selected ? (
              <>
                <ItemIcon id={selected.itemId} quality={selected.quality} size={64} />
                <h3>{selected.name}</h3>
                <p className="detail-muted">{selected.qualityLabel}</p>
                <Link
                  className="text-link"
                  href={`/tools/market?${new URLSearchParams({ region, item: selected.itemId, quality: String(selected.quality) })}`}
                >
                  Compare prices <ArrowUpRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <CircleHelp size={32} />
                <h3>{selectedSlot} · empty slot</h3>
                <p className="detail-muted">
                  No item equipped. Select another slot or make your own copy to add equipment.
                </p>
              </>
            )}
          </div>
          <div id="build-abilities" className="detail-selected-abilities">
            {selected ? (
              <AbilityGroup item={selected} selected />
            ) : (
              <p className="detail-muted">No item equipped in this slot.</p>
            )}
          </div>
          {selected && !!selected.alternateItems.length && (
            <div className="detail-selected-swaps">
              <span className="detail-muted">Alternatives</span>
              {selected.alternateItems.map((alt) => (
                <a
                  href={`#build-alternatives-${selected.slot.replaceAll(" ", "-")}`}
                  key={alt.id}
                  title={alt.name}
                >
                  <ItemIcon id={alt.id} size={36} />
                  <span className="sr-only">Inspect {alt.name} alternative</span>
                </a>
              ))}
            </div>
          )}
          <div className="detail-context-actions">
            <a className="text-link detail-inventory-return" href="#build-equipment">
              Back to equipment ↑
            </a>
            <a className="button secondary" href="#build-cost">
              Check loadout cost <ArrowUpRight size={14} />
            </a>
            {extraActions}
          </div>
          <p className="detail-muted detail-ability-guidance">
            Author’s recorded selections. Check current balance and character unlocks in game.
          </p>
        </aside>
      </div>
      <div className="detail-secondary-sections">
        <details
          className="raised detail-disclosure detail-other-abilities"
          id="build-all-abilities"
        >
          <summary>
            <span>
              <Layers size={16} /> Other equipment abilities
            </span>
            <small>{spellCount - (selected?.spells?.length || 0)} selections</small>
          </summary>
          <div className="detail-disclosure-content detail-other-ability-grid">
            {ordered
              .filter(
                (item) =>
                  item.slot !== selectedSlot &&
                  ((item.spells?.length || 0) > 0 || item.abilityNotes || item.alternativeNotes),
              )
              .map((item) => (
                <AbilityGroup key={item.slot} item={item} />
              ))}
            {!ordered.some(
              (item) =>
                item.slot !== selectedSlot &&
                ((item.spells?.length || 0) > 0 || item.abilityNotes || item.alternativeNotes),
            ) && (
              <p className="detail-muted">No other ability selections specified for this build.</p>
            )}
          </div>
        </details>
        {recommendations && (
          <details className="raised detail-disclosure detail-recommendations">
            <summary>
              <span>Recommended traits</span>
              <small>Author’s recommendations</small>
            </summary>
            <div className="detail-disclosure-content">{recommendations}</div>
          </details>
        )}
        <details
          className="raised detail-disclosure detail-alternatives-panel"
          id="build-alternatives"
        >
          <summary>
            <span>Alternative equipment</span>
            <small>{altCount} configured choices</small>
          </summary>
          <div className="detail-disclosure-content">
            {alternatives.length ? (
              <>
                <div
                  className="detail-alternative-tabs"
                  role="tablist"
                  aria-label="Alternative equipment slots"
                >
                  {alternatives.map((item, index) => (
                    <button
                      type="button"
                      role="tab"
                      key={item.slot}
                      id={alternativeTabId(item.slot)}
                      aria-controls={`build-alternatives-${item.slot.replaceAll(" ", "-")}`}
                      aria-selected={activeAlternative === item.slot}
                      tabIndex={activeAlternative === item.slot ? 0 : -1}
                      onClick={() => setSelectedSlot(item.slot)}
                      onKeyDown={(e) => {
                        const next =
                          e.key === "ArrowRight"
                            ? (index + 1) % alternatives.length
                            : e.key === "ArrowLeft"
                              ? (index - 1 + alternatives.length) % alternatives.length
                              : e.key === "Home"
                                ? 0
                                : e.key === "End"
                                  ? alternatives.length - 1
                                  : -1;
                        if (next >= 0) {
                          e.preventDefault();
                          setSelectedSlot(alternatives[next].slot);
                          document
                            .getElementById(alternativeTabId(alternatives[next].slot))
                            ?.focus();
                        }
                      }}
                    >
                      {item.slot} <span>{item.alternateItems.length}</span>
                    </button>
                  ))}
                </div>
                <div className="detail-alternative-groups">
                  {alternatives.map((item) => (
                    <section
                      id={`build-alternatives-${item.slot.replaceAll(" ", "-")}`}
                      key={item.slot}
                      data-slot={item.slot}
                      role="tabpanel"
                      aria-labelledby={alternativeTabId(item.slot)}
                      hidden={activeAlternative !== item.slot}
                      className={activeAlternative === item.slot ? "is-selected" : ""}
                    >
                      <h3 className="detail-alternative-slot">{item.slot}</h3>
                      <div>
                        {item.alternateItems.map((alt) => (
                          <article className="detail-alternative-card" key={alt.id}>
                            <ItemIcon id={alt.id} size={52} />
                            <h3>{alt.name}</h3>
                            <Link
                              className="text-link"
                              href={`/tools/market?${new URLSearchParams({ region, item: alt.id, quality: "1" })}`}
                            >
                              Compare prices · Normal
                            </Link>
                            {!!alt.spells.length && (
                              <div
                                className="detail-alternative-spells"
                                aria-label={`${item.slot} alternative recorded abilities`}
                              >
                                {alt.spells.map((spell, i) => (
                                  <span key={`${spell.id}-${i}`} title={spell.name}>
                                    <SpellIcon id={spell.id} name={spell.name} size={28} />
                                    <span className="sr-only">{spell.name}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <p className="detail-muted">No alternative equipment has been specified.</p>
            )}
          </div>
        </details>
        <details className="raised detail-disclosure detail-statistics-panel" id="build-stats">
          <summary>
            <span>Build facts & assumptions</span>
            <small>
              {equipment.length}/10 slots · {region}
            </small>
          </summary>
          <div className="detail-disclosure-content">
            <dl className="detail-statistics">
              <div>
                <dt>Equipment assigned</dt>
                <dd>{equipment.length}/10 slots</dd>
              </div>
              <div>
                <dt>Ability selections</dt>
                <dd>{spellCount}</dd>
              </div>
              <div>
                <dt>Alternative items</dt>
                <dd>{altCount}</dd>
              </div>
              <div>
                <dt>Recommended item power</dt>
                <dd>
                  {information?.recommendedIP
                    ? `${information.recommendedIP} · author estimate`
                    : "Not specified"}
                </dd>
              </div>
            </dl>
            <div className="detail-information-panel">
              <dl className="detail-facts">
                {information?.activity && (
                  <div>
                    <dt>Content type</dt>
                    <dd>{information.activity}</dd>
                  </div>
                )}
                {information?.author && (
                  <div>
                    <dt>Author</dt>
                    <dd>{information.author}</dd>
                  </div>
                )}
                <div>
                  <dt>Market region</dt>
                  <dd className="detail-capitalize">{region}</dd>
                </div>
                {sourceRegion && (
                  <div>
                    <dt>Build server</dt>
                    <dd className="detail-capitalize">{sourceRegion}</dd>
                  </div>
                )}
                {information?.playerCount !== undefined && (
                  <div>
                    <dt>Party size</dt>
                    <dd>
                      {information.playerCount}{" "}
                      {information.playerCount === 1 ? "player" : "players"}
                    </dd>
                  </div>
                )}
                {information?.version !== undefined && (
                  <div>
                    <dt>Revision</dt>
                    <dd>{information.version}</dd>
                  </div>
                )}
                {information?.updatedAt && (
                  <div>
                    <dt>Updated</dt>
                    <dd>{information.updatedAt.slice(0, 10)}</dd>
                  </div>
                )}
              </dl>
            </div>
            <p className="detail-muted">
              Combat stats depend on your mastery, equipment and bonuses. Check your character’s
              final values in game.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
