"use client";
import { useId, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, CircleHelp, Layers, ShieldCheck, Swords } from "lucide-react";
import Link from "./link";
import { useAtlasRegion } from "./region-context";
import { InventoryEquipmentBoard, type InventoryEquipmentItem } from "./inventory-equipment-board";
import { ItemIcon } from "./item-icon";
import { SpellIcon } from "./spell-icon";
import { EquipmentMarketLink } from "./archive-build-links";
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
        <div className="detail-spell-grid" aria-label={`${item.slot} recorded abilities`}>
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
  return (
    <section
      className="build-loadout-view detail-workspace"
      id="build-equipment"
      aria-label="Build equipment and abilities"
      data-selected-slot={selectedSlot}
    >
      <div className="detail-workspace-grid">
        <section className="detail-inventory-panel" aria-label="Inventory loadout">
          <div className="detail-panel-heading">
            <h2>
              <Swords size={17} /> Equipment & abilities
            </h2>
            <span>{equipment.length}/10 equipped</span>
          </div>
          <InventoryEquipmentBoard
            equipment={equipment}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
          <p className="detail-inventory-hint">
            Select a slot to inspect its equipment and choices.
          </p>
          <div id="build-abilities" className="detail-selected-abilities">
            <p className="detail-muted detail-ability-guidance">
              Recorded choices; check current balance and character unlocks.
            </p>
            {selected ? (
              <AbilityGroup item={selected} selected />
            ) : (
              <div className="detail-empty-slot">
                <h3>{selectedSlot}</h3>
                <p>No item equipped in this slot.</p>
              </div>
            )}
          </div>
        </section>
        <aside className="detail-information-panel" aria-label="Build information">
          <div className="detail-panel-heading">
            <h2>Build information</h2>
          </div>
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
                  {information.playerCount} {information.playerCount === 1 ? "player" : "players"}
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
          <h3 className="detail-rail-title">Equipment</h3>
          <div className="detail-slot-list">
            {slots.map((slot) => {
              const item = equipment.find((row) => row.slot === slot);
              return (
                <div
                  id={`build-gear-${slot.replaceAll(" ", "-")}`}
                  key={slot}
                  className={selectedSlot === slot ? "is-selected" : ""}
                >
                  <button
                    type="button"
                    aria-pressed={selectedSlot === slot}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {item ? (
                      <ItemIcon id={item.itemId} quality={item.quality} size={36} />
                    ) : (
                      <span className="detail-slot-empty" aria-hidden="true">
                        ×
                      </span>
                    )}
                    <span>
                      <small>{slot}</small>
                      <strong>{item?.name || "Empty slot"}</strong>
                    </span>
                    <ArrowRight size={13} />
                  </button>
                  {selectedSlot === slot && item && (
                    <EquipmentMarketLink
                      itemId={item.itemId}
                      quality={item.quality}
                      region={region}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </aside>
        <aside className="detail-summary-panel" aria-label="Build summary">
          <div className="detail-panel-heading">
            <h2>Build summary</h2>
          </div>
          <div className="detail-summary-count">
            <strong>
              {equipment.length}
              <small>/10</small>
            </strong>
            <span>Equipped slots</span>
          </div>
          <div
            className="detail-completion-meter"
            role="img"
            aria-label={`${equipment.length} of 10 slots equipped`}
          >
            <span style={{ width: `${Math.min(100, equipment.length * 10)}%` }} />
          </div>
          <div className="detail-summary-metrics">
            <span>
              <Layers size={16} />
              <b>{spellCount}</b> ability selections
            </span>
            <span>
              <ShieldCheck size={16} />
              <b>{altCount}</b> configured alternatives
            </span>
          </div>
          <div className="detail-selected-item" aria-live="polite">
            {selected ? (
              <>
                <ItemIcon id={selected.itemId} quality={selected.quality} size={64} />
                <small>{selectedSlot}</small>
                <h3>{selected.name}</h3>
                <dl className="detail-facts">
                  <div>
                    <dt>Tier / enchantment</dt>
                    <dd>{selected.tierLabel || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Quality</dt>
                    <dd>{selected.qualityLabel}</dd>
                  </div>
                  <div>
                    <dt>Alternatives</dt>
                    <dd>{selected.alternateItems.length}</dd>
                  </div>
                </dl>
                {!!selected.alternateItems.length && (
                  <div className="detail-selected-swaps">
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
              </>
            ) : (
              <>
                <CircleHelp size={32} />
                <h3>{selectedSlot}</h3>
                <p>No item equipped. This slot remains empty in the author’s loadout.</p>
              </>
            )}
          </div>
          <div className="detail-quick-actions">
            <a className="button primary" href="#build-cost">
              Calculate replacement cost
            </a>
            {selected && (
              <Link
                className="button secondary"
                href={`/tools/market?${new URLSearchParams({ region, item: selected.itemId, quality: String(selected.quality) })}`}
              >
                View on market <ArrowUpRight size={14} />
              </Link>
            )}
            <a className="text-link" href="#build-alternatives">
              Inspect alternatives →
            </a>
            {extraActions}
          </div>
        </aside>
      </div>
      <div className={`detail-lower-grid${recommendations ? " has-recommendations" : ""}`}>
        <section className="detail-other-abilities" aria-label="All equipment abilities">
          <div className="detail-panel-heading">
            <h2>Equipment choices</h2>
            <span>Author’s selections</span>
          </div>
          <div className="detail-other-ability-grid">
            {ordered
              .filter(
                (item) =>
                  item.slot !== selectedSlot &&
                  ((item.spells?.length || 0) > 0 || item.abilityNotes || item.alternativeNotes),
              )
              .map((item) => (
                <AbilityGroup key={item.slot} item={item} />
              ))}
          </div>
        </section>
        {recommendations && <aside className="detail-recommendations">{recommendations}</aside>}
      </div>
      <section className="detail-alternatives-panel" id="build-alternatives">
        <div className="detail-panel-heading">
          <h2>Alternative equipment</h2>
          <span>{altCount} configured choices</span>
        </div>
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
                      document.getElementById(alternativeTabId(alternatives[next].slot))?.focus();
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
      </section>
      <section className="detail-statistics-panel" id="build-stats">
        <div className="detail-panel-heading">
          <h2>Stats & loadout facts</h2>
        </div>
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
        <p className="detail-muted">
          Combat stats depend on your mastery, equipment and bonuses. Check your character’s final
          values in game.
        </p>
      </section>
    </section>
  );
}
