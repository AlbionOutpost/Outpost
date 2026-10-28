"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, Settings2, Star, X } from "lucide-react";
import {
  equipmentFamilies,
  equipmentId,
  equipmentName,
  equipmentSlots,
  findEquipment,
  type EquipmentSlot,
} from "@/lib/albion/equipment-catalog";
import { abilitiesFor, archivedSpellOptions } from "@/lib/albion/equipment-abilities";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { EditorDialog } from "./editor-dialog";
import { EquipmentGlyph } from "./equipment-overview";
import { ItemIcon } from "./item-icon";
import { SpellIcon } from "./spell-icon";

const groups = [
  {
    title: "Equipment & abilities",
    slots: ["Main hand", "Off hand", "Helmet", "Chest", "Boots", "Cape"],
  },
  { title: "Consumables", slots: ["Potion", "Food"] },
  { title: "Travel & inventory", slots: ["Bag", "Mount"] },
] as const;

function SelectedSpells({ item }: { item: EquipmentChoice }) {
  return (
    <span className="studio-tile-spells" aria-hidden="true">
      {Object.entries(item.abilities).map(([key, name]) => {
        const spell = archivedSpellOptions(item.itemId).find(
          (s) => s.key === key && s.name === name,
        );
        return (
          <span key={key} title={`${key}: ${name}`}>
            {spell ? (
              <SpellIcon id={spell.id} name={name} size={22} />
            ) : (
              <b>{key === "Passive" ? "P" : key.slice(0, 1)}</b>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function BuildEquipmentStudio({
  value,
  onChange,
}: {
  value: EquipmentChoice[];
  onChange: (value: EquipmentChoice[]) => void;
}) {
  const [slot, setSlot] = useState<EquipmentSlot>("Main hand");
  const [picker, setPicker] = useState<"recommended" | "alternative" | null>(null);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState(4);
  const [enchant, setEnchant] = useState(0);
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<EquipmentChoice[] | null>(null);
  const [settings, setSettings] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const overviewId = useId();
  const settingsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!picker) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [picker]);
  const current = value.find((row) => row.slot === slot);
  const found = current ? findEquipment(current.itemId) : null;
  const twoHanded = !!findEquipment(value.find((row) => row.slot === "Main hand")?.itemId || "")
    ?.family.twoHanded;

  function change(next: EquipmentChoice | null, target: EquipmentSlot = slot) {
    if (target === "Off hand" && next && twoHanded) {
      setNotice("This weapon uses both hands. Choose a one-handed weapon to equip an off hand.");
      return;
    }
    let rows = value.filter((row) => row.slot !== target);
    setUndo(null);
    setNotice("");
    if (
      next?.slot === "Main hand" &&
      findEquipment(next.itemId)?.family.twoHanded &&
      rows.some((row) => row.slot === "Off hand")
    ) {
      setUndo(structuredClone(value));
      rows = rows.filter((row) => row.slot !== "Off hand");
      setNotice("Off hand cleared: this weapon uses both hands.");
    }
    if (next) {
      const itemId = next.itemId;
      const options = abilitiesFor(next.itemId);
      next = {
        ...next,
        abilities: Object.fromEntries(
          Object.entries(next.abilities).filter(([key, name]) => options[key]?.includes(name)),
        ),
        alternatives: next.alternatives.filter((id) => id !== itemId),
      };
    }
    onChange([...rows, ...(next ? [next] : [])]);
  }

  function browse(target: EquipmentSlot, mode: "recommended" | "alternative" = "recommended") {
    const item = value.find((row) => row.slot === target);
    const info = item ? findEquipment(item.itemId) : null;
    const family = info?.family || equipmentFamilies.find((row) => row.slot === target);
    setSlot(target);
    setQuery("");
    setPage(0);
    setTier(info?.tier || (family?.tiers.includes(4) ? 4 : family?.tiers[0] || 4));
    setEnchant(info?.enchantment || 0);
    setPicker(mode);
  }

  function configure(target: EquipmentSlot) {
    setSlot(target);
    setSettings(true);
    requestAnimationFrame(() => {
      settingsRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
      settingsRef.current?.querySelector<HTMLElement>("select")?.focus({ preventScroll: true });
    });
  }

  function choose(id: string) {
    if (picker === "recommended" && current?.itemId === id) {
      setPicker(null);
      return;
    }
    if (picker === "alternative" && current)
      change({ ...current, alternatives: [...new Set([id, ...current.alternatives])].slice(0, 4) });
    else
      change({
        slot,
        itemId: id,
        quality: current?.quality || 1,
        abilities: {},
        alternatives: current?.alternatives.filter((alt) => alt !== id) || [],
      });
    setPicker(null);
  }

  const matches = equipmentFamilies
    .filter(
      (f) =>
        f.slot === slot &&
        `${f.name} ${f.code}`.toLowerCase().includes(query.toLowerCase()) &&
        !!findEquipment(equipmentId(f, tier, enchant)),
    )
    .filter((f) => picker !== "alternative" || equipmentId(f, tier, enchant) !== current?.itemId);

  return (
    <div className="build-studio gear-studio" data-studio="immersive">
      {notice && (
        <div className="studio-notice" role="status">
          {notice}
          {undo && (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                onChange(undo);
                setUndo(null);
                setNotice("");
              }}
            >
              Undo equipment change
            </button>
          )}
        </div>
      )}
      <div className="studio-loadout-list">
        {groups.map((group) => (
          <section className="studio-equipment-section" key={group.title}>
            <header>
              <h2>{group.title}</h2>
              {group.title === "Equipment & abilities" && (
                <span className="studio-help">Click an item to equip it</span>
              )}
            </header>
            <div className="studio-column-headings">
              <span>
                <Star size={12} /> Recommended
              </span>
              <span>Alternatives</span>
            </div>
            {group.slots.map((target) => {
              const item = value.find((row) => row.slot === target);
              const blocked = target === "Off hand" && twoHanded;
              const options = item ? abilitiesFor(item.itemId) : {};
              const alt = item?.alternatives[0];
              return (
                <div
                  className={`studio-equipment-row${slot === target ? " active" : ""}`}
                  key={target}
                >
                  <div className="studio-equipped-item">
                    <button
                      type="button"
                      className="studio-item-trigger"
                      disabled={blocked}
                      onClick={() => browse(target)}
                    >
                      <span className="sr-only">Choose {target} equipment: </span>
                      <span className="studio-item-art">
                        {item ? (
                          <ItemIcon id={item.itemId} quality={item.quality} size={64} />
                        ) : (
                          <EquipmentGlyph slot={target} />
                        )}
                      </span>
                      <span className="studio-item-copy">
                        <small>{target}</small>
                        <strong>
                          {item
                            ? equipmentName(item.itemId)
                            : blocked
                              ? "Two-handed weapon"
                              : `Choose ${target.toLowerCase()}`}
                        </strong>
                        {!item && !blocked && (
                          <span>
                            Browse equipment <Plus size={12} />
                          </span>
                        )}
                      </span>
                    </button>
                    {item && (
                      <>
                        <div
                          className="studio-spell-choices"
                          aria-label={`${target} abilities & passives`}
                        >
                          {Object.entries(options).map(([key, choices]) => {
                            const name = item.abilities[key];
                            const spell = archivedSpellOptions(item.itemId).find(
                              (s) => s.key === key && s.name === name,
                            );
                            return (
                              <label
                                key={key}
                                className={`studio-spell-choice${name ? " chosen" : ""}`}
                                title={`${key}: ${name || "Choose ability"}`}
                              >
                                {spell ? (
                                  <SpellIcon id={spell.id} name={name} size={32} />
                                ) : (
                                  <span aria-hidden="true">
                                    {key === "Passive" ? "P" : key === "Active" ? "A" : key}
                                  </span>
                                )}
                                <select
                                  aria-label={`${target} ${key}`}
                                  value={name || ""}
                                  onChange={(event) => {
                                    const abilities = { ...item.abilities };
                                    if (event.target.value) abilities[key] = event.target.value;
                                    else delete abilities[key];
                                    change({ ...item, abilities }, target);
                                  }}
                                >
                                  <option value="">
                                    Choose {key === "Passive" ? "passive" : `${key} ability`}
                                  </option>
                                  {choices.map((name) => (
                                    <option key={name}>{name}</option>
                                  ))}
                                </select>
                              </label>
                            );
                          })}
                          <button
                            type="button"
                            className="studio-configure"
                            aria-label={`Configure ${target}`}
                            title="Tier, enchantment, quality & swaps"
                            onClick={() => configure(target)}
                          >
                            <Settings2 size={15} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="studio-alternative-item">
                    <button
                      type="button"
                      className={`studio-item-trigger${alt ? "" : " studio-add-alternative"}`}
                      disabled={!item || blocked}
                      onClick={() => browse(target, "alternative")}
                    >
                      <span className="sr-only">Choose alternative {target}: </span>
                      <span className="studio-item-art">
                        {alt ? <ItemIcon id={alt} size={56} /> : <Plus size={18} />}
                      </span>
                      <span className="studio-item-copy">
                        {alt ? (
                          <>
                            <small>{target} swap</small>
                            <strong>{equipmentName(alt)}</strong>
                          </>
                        ) : (
                          <span>Add alternative</span>
                        )}
                      </span>
                    </button>
                    {!!item && item.alternatives.length > 1 && (
                      <button
                        type="button"
                        className="text-link studio-more-swaps"
                        onClick={() => configure(target)}
                      >
                        +{item.alternatives.length - 1} more{" "}
                        {item.alternatives.length === 2 ? "swap" : "swaps"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <aside
        className={`studio-overview${overviewOpen ? " expanded" : ""}`}
        aria-label="Character equipment"
      >
        <div className="studio-overview-heading">
          <h2>Your loadout</h2>
          <span>{value.length}/10 equipped</span>
          <button
            type="button"
            className="studio-overview-toggle"
            aria-expanded={overviewOpen}
            aria-controls={overviewId}
            onClick={() => setOverviewOpen(!overviewOpen)}
          >
            {overviewOpen ? "Hide" : "Show"} overview <ChevronDown size={14} />
          </button>
        </div>
        <div id={overviewId} className="character-slots studio-character-slots">
          {equipmentSlots.map((target) => {
            const item = value.find((row) => row.slot === target);
            const blocked = target === "Off hand" && twoHanded;
            return (
              <button
                type="button"
                key={target}
                data-slot={target}
                className={`character-slot${item ? " equipped" : ""}${target === slot ? " selected" : ""}`}
                aria-pressed={target === slot}
                disabled={blocked}
                onClick={() => browse(target)}
              >
                <span className="sr-only">Select {target} slot: </span>
                <span className="slot-caption">{target}</span>
                {item ? (
                  <ItemIcon id={item.itemId} quality={item.quality} size={80} />
                ) : (
                  <EquipmentGlyph slot={target} />
                )}
                {item && <SelectedSpells item={item} />}
                <span className="slot-item-name">
                  {item ? equipmentName(item.itemId) : blocked ? "Two-handed" : "Empty"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="studio-overview-actions">
          <button type="button" className="button secondary" onClick={() => configure(slot)}>
            <Settings2 size={15} /> Item details
          </button>
          <span>
            {value.reduce((total, row) => total + Object.keys(row.abilities).length, 0)} abilities
            chosen
          </span>
        </div>
        {settings && (
          <div
            className="studio-item-settings"
            ref={settingsRef}
            aria-label="Selected equipment details"
          >
            <div className="studio-settings-heading">
              <h3>{slot}</h3>
              <button
                type="button"
                aria-label="Close item details"
                onClick={() => setSettings(false)}
              >
                <X size={16} />
              </button>
            </div>
            <label>
              {slot} equipment
              <select
                aria-label={`${slot} equipment`}
                value={found?.family.code || ""}
                onChange={(event) => {
                  const f = equipmentFamilies.find(
                    (f) => f.code === event.target.value && f.slot === slot,
                  );
                  change(
                    f
                      ? {
                          slot,
                          itemId: equipmentId(
                            f,
                            f.tiers.includes(found?.tier || 4) ? found?.tier || 4 : f.tiers[0],
                            0,
                          ),
                          quality: current?.quality || 1,
                          abilities: {},
                          alternatives: [],
                        }
                      : null,
                  );
                }}
              >
                <option value="">No equipment</option>
                {equipmentFamilies
                  .filter((f) => f.slot === slot)
                  .map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </label>
            {current && found && (
              <>
                <div className="gear-options">
                  <label>
                    Tier
                    <select
                      aria-label={`${slot} tier`}
                      value={found.tier}
                      onChange={(event) =>
                        change({
                          ...current,
                          itemId: equipmentId(
                            found.family,
                            Number(event.target.value),
                            found.enchantment,
                          ),
                        })
                      }
                    >
                      {found.family.tiers
                        .filter(
                          (t) => !!findEquipment(equipmentId(found.family, t, found.enchantment)),
                        )
                        .map((t) => (
                          <option key={t} value={t}>
                            T{t}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Enchant
                    <select
                      aria-label={`${slot} enchantment`}
                      value={found.enchantment}
                      onChange={(event) =>
                        change({
                          ...current,
                          itemId: equipmentId(found.family, found.tier, Number(event.target.value)),
                        })
                      }
                    >
                      {found.family.enchants
                        .filter((e) => !!findEquipment(equipmentId(found.family, found.tier, e)))
                        .map((e) => (
                          <option key={e} value={e}>
                            .{e}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Quality
                    <select
                      aria-label={`${slot} quality`}
                      value={current.quality}
                      onChange={(event) =>
                        change({ ...current, quality: Number(event.target.value) })
                      }
                    >
                      {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((q, i) => (
                        <option key={q} value={i + 1}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {current.alternatives.map((id, index) => (
                  <label key={index}>
                    Alternative {index + 1}
                    <select
                      aria-label={`${slot} alternative${index ? ` ${index + 1}` : ""}`}
                      value={id}
                      onChange={(event) =>
                        change({
                          ...current,
                          alternatives: current.alternatives
                            .map((alt, i) => (i === index ? event.target.value : alt))
                            .filter(Boolean),
                        })
                      }
                    >
                      <option value="">Remove alternative</option>
                      {[
                        ...new Set([
                          id,
                          ...equipmentFamilies
                            .filter((f) => f.slot === slot)
                            .flatMap((f) =>
                              f.tiers.flatMap((t) => f.enchants.map((e) => equipmentId(f, t, e))),
                            )
                            .filter((id) => id !== current.itemId && !!findEquipment(id)),
                        ]),
                      ].map((id) => (
                        <option key={id} value={id}>
                          {equipmentName(id)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button type="button" className="text-link" onClick={() => change(null)}>
                  Remove {slot}
                </button>
              </>
            )}
          </div>
        )}
        <details className="studio-source-note">
          <summary>
            About abilities & game data <ChevronDown size={13} />
          </summary>
          <p>
            Recorded source options include historical references. Confirm character unlocks and
            current patch availability in game. Item power and combat statistics are not inferred.
          </p>
        </details>
      </aside>
      {picker && (
        <EditorDialog open wide title="Equipment picker" onClose={() => setPicker(null)}>
          <div className="studio-picker">
            <div className="studio-picker-heading">
              <div>
                <h3>
                  {picker === "alternative"
                    ? `${slot} alternatives`
                    : `Choose your ${slot.toLowerCase()}`}
                </h3>
                <p>{matches.length} matching equipment families</p>
              </div>
            </div>
            <div className="studio-picker-toolbar">
              <label className="studio-picker-search">
                <span>
                  <Search size={15} /> Search equipment
                </span>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  placeholder="Battleaxe, Bloodmoon, Hunter…"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label>
                Tier
                <select
                  aria-label="Browse tier"
                  value={tier}
                  onChange={(event) => {
                    setTier(Number(event.target.value));
                    setPage(0);
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                    <option key={t} value={t}>
                      T{t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Enchant
                <select
                  aria-label="Browse enchantment"
                  value={enchant}
                  onChange={(event) => {
                    setEnchant(Number(event.target.value));
                    setPage(0);
                  }}
                >
                  {[0, 1, 2, 3, 4].map((e) => (
                    <option key={e} value={e}>
                      .{e}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="studio-picker-grid">
              {matches.slice(page * 24, (page + 1) * 24).map((f) => {
                const id = equipmentId(f, tier, enchant);
                return (
                  <button
                    className={`studio-picker-item${current?.itemId === id ? " selected" : ""}`}
                    type="button"
                    key={id}
                    onClick={() => choose(id)}
                  >
                    <ItemIcon id={id} size={80} />
                    <strong>
                      <span className="sr-only">Equip </span>
                      {f.tierNames?.[tier] || f.name}
                    </strong>
                    <small>
                      T{tier}.{enchant}
                    </small>
                    {current?.itemId === id && <Check size={14} />}
                  </button>
                );
              })}
            </div>
            {!matches.length && (
              <p className="studio-picker-empty">
                No supported item matches this slot, search and tier/enchantment filters. Try
                another tier or clear your search.
              </p>
            )}
            {matches.length > 24 && (
              <div className="studio-picker-pagination">
                <button
                  type="button"
                  className="button secondary"
                  disabled={!page}
                  onClick={() => setPage(page - 1)}
                >
                  Previous items
                </button>
                <span>
                  {page * 24 + 1}–{Math.min((page + 1) * 24, matches.length)} of {matches.length}
                </span>
                <button
                  type="button"
                  className="button secondary"
                  disabled={(page + 1) * 24 >= matches.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next items
                </button>
              </div>
            )}
          </div>
        </EditorDialog>
      )}
    </div>
  );
}
