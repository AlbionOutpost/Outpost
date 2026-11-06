"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, Plus, Search, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import {
  equipmentFamilies,
  equipmentId,
  equipmentName,
  equipmentSlots,
  findEquipment,
  type EquipmentSlot,
} from "@/lib/albion/equipment-catalog";
import { abilitiesFor, archivedSpellOptions } from "@/lib/albion/equipment-abilities";
import { equipmentChoice } from "@/lib/albion/equipment-validation";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { EditorDialog } from "./editor-dialog";
import { LoadoutBoard } from "./loadout-board";
import { ItemIcon } from "./item-icon";
import { SpellIcon } from "./spell-icon";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { Disclosure } from "./disclosure";
import { WellSelect } from "./well-select";

export type BuildStudioView = "equipment" | "abilities" | "alternatives";
const qualityNames = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];

export function BuildEquipmentStudio({
  value,
  onChange,
  view = "equipment",
  captureUndo,
  boardEmpty,
  flaggedSlot,
}: {
  value: EquipmentChoice[];
  onChange: (value: EquipmentChoice[]) => void;
  view?: BuildStudioView;
  captureUndo?: () => () => void;
  /** Shown in the board's panel while nothing is equipped: the one way to start. */
  boardEmpty?: ReactNode;
  /** A slot to mark, such as a missing main hand after a failed save. */
  flaggedSlot?: string;
}) {
  const [slot, setSlot] = useState<EquipmentSlot>("Main hand");
  const [picker, setPicker] = useState<"recommended" | "alternative" | null>(null);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState(4);
  const [enchant, setEnchant] = useState(0);
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<{
    equipment: EquipmentChoice[];
    restore?: () => void;
  } | null>(null);
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
  const blocked = slot === "Off hand" && twoHanded;
  function selectSlot(target: EquipmentSlot) {
    setSlot(target);
    if (matchMedia("(max-width: 980px)").matches)
      requestAnimationFrame(() => {
        const panel = document.getElementById("editor-selected-slot");
        panel?.focus({ preventScroll: true });
        panel?.scrollIntoView({ block: "start", behavior: "instant" });
      });
  }

  function change(
    next: EquipmentChoice | null,
    target: EquipmentSlot = slot,
    action?: { undoable: boolean; message: string },
  ) {
    if (target === "Off hand" && next && twoHanded) {
      setNotice("This weapon uses both hands. Choose a one-handed weapon to equip an off hand.");
      return;
    }
    if (next) {
      const allowed = abilitiesFor(next.itemId);
      const selectedId = next.itemId;
      next = {
        ...next,
        abilities: Object.fromEntries(
          Object.entries(next.abilities).filter(([key, name]) => allowed[key]?.includes(name)),
        ),
        alternatives: next.alternatives.filter((id) => id !== selectedId),
      };
      if (!equipmentChoice.safeParse(next).success) {
        setNotice(
          "Choose supported equipment and alternatives for this slot before applying the change.",
        );
        return;
      }
    }
    let rows = value.filter((row) => row.slot !== target);
    const clearsOffHand =
      next?.slot === "Main hand" &&
      findEquipment(next.itemId)?.family.twoHanded &&
      rows.some((row) => row.slot === "Off hand");
    setUndo(
      action?.undoable || clearsOffHand
        ? { equipment: structuredClone(value), restore: captureUndo?.() }
        : null,
    );
    setNotice(
      [action?.message, clearsOffHand ? "Off hand cleared: this weapon uses both hands." : ""]
        .filter(Boolean)
        .join(" "),
    );
    if (clearsOffHand) rows = rows.filter((row) => row.slot !== "Off hand");
    onChange([...rows, ...(next ? [next] : [])]);
  }
  function applyAlternative(id: string) {
    if (!current || findEquipment(id)?.family.slot !== slot) {
      setNotice("This alternative is unavailable for the selected equipment slot.");
      return;
    }
    change(
      {
        ...current,
        itemId: id,
        alternatives: [
          ...new Set([current.itemId, ...current.alternatives.filter((alt) => alt !== id)]),
        ],
      },
      slot,
      {
        undoable: true,
        message: `Equipped ${equipmentName(id)}. The previous item is kept as an alternative.`,
      },
    );
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
  const pieces = value.map((item) => {
    const spells = archivedSpellOptions(item.itemId);
    return {
      slot: item.slot,
      itemId: item.itemId,
      name: equipmentName(item.itemId),
      swap: item.alternatives[0],
      skills: Object.entries(item.abilities).flatMap(([key, name]) => {
        const id = spells.find((spell) => spell.key === key && spell.name === name)?.id;
        return id ? [id] : [];
      }),
    };
  });
  const spellNames = Object.fromEntries(
    value.flatMap((item) => archivedSpellOptions(item.itemId).map((s) => [s.id, s.name])),
  );
  const pieceName = (itemId: string) => {
    const info = findEquipment(itemId);
    return info ? info.family.tierNames?.[info.tier] || info.family.name : equipmentName(itemId);
  };
  const pieceLine = (item: EquipmentChoice) => {
    const info = findEquipment(item.itemId);
    return [info && `T${info.tier}.${info.enchantment}`, qualityNames[item.quality - 1]]
      .filter(Boolean)
      .join(" · ");
  };
  /** The detail page's Q/W/E/Passive tiles; each tile is a native select so it opens the
   * choice and keeps keyboard and phone pickers. */
  const abilityTiles = (item: EquipmentChoice) => {
    const allowed = abilitiesFor(item.itemId);
    const spells = archivedSpellOptions(item.itemId);
    if (!Object.keys(allowed).length)
      return <p className="editor-muted">This piece has no abilities to choose.</p>;
    return (
      <div
        className="studio-spell-choices detail-spell-grid editor-spell-tiles"
        aria-label={`${item.slot} abilities & passives`}
      >
        {Object.entries(allowed).map(([key, choices]) => {
          const name = item.abilities[key];
          const spell = spells.find((s) => s.key === key && s.name === name);
          return (
            <label
              key={key}
              className={`detail-spell-choice editor-spell-tile${name ? " is-chosen" : ""}`}
            >
              <small>{key}</small>
              {spell ? (
                <SpellIcon id={spell.id} name={name!} size={46} />
              ) : (
                <span className="editor-spell-empty" aria-hidden="true">
                  <Plus size={18} />
                </span>
              )}
              <span>{name || "Choose"}</span>
              <select
                className="editor-spell-select"
                aria-label={`${item.slot} ${key}`}
                value={name || ""}
                onChange={(event) => {
                  const abilities = { ...item.abilities };
                  if (event.target.value) abilities[key] = event.target.value;
                  else delete abilities[key];
                  change({ ...item, abilities }, item.slot as EquipmentSlot);
                }}
              >
                <option value="">No {key === "Passive" ? "passive" : `${key} ability`}</option>
                {choices.map((choice) => (
                  <option key={choice}>{choice}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    );
  };
  // An empty slot shows the first T4 pieces for it in place, so the inspector is never blank
  const starterTier = (family: (typeof equipmentFamilies)[number]) =>
    family.tiers.includes(4) ? 4 : family.tiers[0];
  const starters = current
    ? []
    : equipmentFamilies
        .filter((f) => f.slot === slot && !!findEquipment(equipmentId(f, starterTier(f), 0)))
        .slice(0, 8);
  const ordered = equipmentSlots.flatMap((s) => value.filter((row) => row.slot === s));
  const withAbilities = ordered.filter((row) => Object.keys(abilitiesFor(row.itemId)).length);
  const withoutAbilities = ordered.filter((row) => !withAbilities.includes(row));
  const removeButton = (label: string, onClick: () => void, text = "Remove") => (
    <button
      type="button"
      className={`button secondary editor-remove-item${text ? "" : " is-icon"}`}
      aria-label={label}
      onClick={onClick}
    >
      <Trash2 size={15} aria-hidden="true" />
      {text && <span>{text}</span>}
    </button>
  );
  const itemRow = current ? (
    <div className="editor-selected-item equipped">
      <ItemIcon id={current.itemId} quality={current.quality} size={64} />
      <div>
        <strong>{pieceName(current.itemId)}</strong>
        <small>{pieceLine(current)}</small>
      </div>
      <div className="editor-item-actions">
        <button
          type="button"
          className="button secondary"
          aria-label={`Choose ${slot} equipment: ${equipmentName(current.itemId)}. Change item`}
          onClick={() => browse(slot)}
        >
          Change item <ArrowRight size={15} aria-hidden="true" />
        </button>
        {removeButton(`Remove ${slot}`, () => change(null))}
      </div>
    </div>
  ) : (
    <div className="editor-selected-item">
      <span className="editor-empty-art" aria-hidden="true">
        <Plus size={26} />
      </span>
      <div>
        <strong>Choose your {slot.toLowerCase()}</strong>
        <small>Empty slot</small>
      </div>
      <div className="editor-item-actions">
        <button
          type="button"
          className="button primary"
          aria-label={`Choose ${slot} equipment: Empty. Choose item`}
          onClick={() => browse(slot)}
        >
          Choose item <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="build-studio gear-studio inventory-editor-studio" data-studio="inventory">
      {notice && (
        <div className="studio-notice editor-notice" role="status">
          <span>{notice}</span>
          {undo && (
            <button
              type="button"
              className="pill-link is-small"
              onClick={() => {
                if (undo.restore) undo.restore();
                else onChange(undo.equipment);
                setUndo(null);
                setNotice("");
              }}
            >
              <Undo2 size={14} aria-hidden="true" /> Undo equipment change
            </button>
          )}
        </div>
      )}
      <aside className="raised editor-inventory-panel" aria-label="Character equipment">
        <PanelHead
          title="Your loadout"
          line={
            twoHanded
              ? "Two-handed weapon: it holds the off hand too."
              : "Select a slot to edit it."
          }
          actions={<span className="landing-chip is-muted">{value.length}/10 equipped</span>}
        />
        <LoadoutBoard
          pieces={pieces}
          spellNames={spellNames}
          size="hero"
          choices
          label="Editor equipment inventory"
          selectedSlot={slot}
          flaggedSlot={flaggedSlot}
          onSelectSlot={(target) => {
            if (equipmentSlots.includes(target as EquipmentSlot))
              selectSlot(target as EquipmentSlot);
          }}
        />
        {!value.length && boardEmpty}
      </aside>
      <section
        className="raised editor-slot-panel studio-loadout-list"
        id="editor-selected-slot"
        tabIndex={-1}
        aria-label="Selected equipment configuration"
      >
        {view === "abilities" ? (
          <PanelHead
            title="Abilities"
            line="Every piece at once. Pick a tile to choose its ability."
          />
        ) : (
          <PanelHead
            title={slot}
            line={
              blocked
                ? "Held by your two-handed main hand."
                : view === "alternatives"
                  ? "Up to four swaps for this slot."
                  : current
                    ? "The piece, its tier and its abilities."
                    : "Nothing equipped in this slot yet."
            }
          />
        )}
        <div className="editor-slot-switcher" role="group" aria-label="Select equipment slot">
          {equipmentSlots.map((target) => (
            <button
              type="button"
              key={target}
              aria-pressed={slot === target}
              onClick={() => setSlot(target)}
            >
              {target}
            </button>
          ))}
        </div>
        {view === "abilities" ? (
          withAbilities.length ? (
            <div className="editor-ability-pieces">
              {withAbilities.map((item) => (
                <section
                  key={item.slot}
                  className={`editor-ability-piece${item.slot === slot ? " is-selected" : ""}`}
                  aria-label={`${item.slot} abilities`}
                >
                  <div className="editor-ability-piece-head">
                    <ItemIcon id={item.itemId} quality={item.quality} size={36} />
                    <div>
                      <small>{item.slot}</small>
                      <strong>{pieceName(item.itemId)}</strong>
                    </div>
                  </div>
                  {abilityTiles(item)}
                </section>
              ))}
              {!!withoutAbilities.length && (
                <p className="editor-muted">
                  No abilities to choose on{" "}
                  {withoutAbilities.map((row) => pieceName(row.itemId)).join(", ")}.
                </p>
              )}
            </div>
          ) : (
            <EmptyWell
              title="No abilities to choose yet"
              line="Equip a weapon or armour piece first; its abilities show here."
            />
          )
        ) : blocked ? (
          <div className="editor-selected-item is-blocked">
            <span className="editor-empty-art" aria-hidden="true">
              <ShieldAlert size={26} />
            </span>
            <div>
              <strong>Your weapon uses both hands</strong>
              <small>Switch to a one-handed weapon to equip an off hand.</small>
            </div>
            <div className="editor-item-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setSlot("Main hand")}
              >
                Inspect main hand <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {itemRow}
            {!current && !!starters.length && (
              <section className="editor-starters" aria-labelledby="editor-starters-title">
                <div className="editor-subhead">
                  <h3 id="editor-starters-title">Start with one of these</h3>
                  <button type="button" className="pill-link is-small" onClick={() => browse(slot)}>
                    Every {slot.toLowerCase()} <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
                <div className="editor-starter-grid">
                  {starters.map((family) => {
                    const id = equipmentId(family, starterTier(family), 0);
                    return (
                      <button
                        type="button"
                        key={id}
                        className="editor-starter"
                        onClick={() =>
                          change({ slot, itemId: id, quality: 1, abilities: {}, alternatives: [] })
                        }
                      >
                        <ItemIcon id={id} size={52} />
                        <span>
                          <strong>
                            <span className="sr-only">Put on </span>
                            {family.tierNames?.[starterTier(family)] || family.name}
                          </strong>
                          <small>T{starterTier(family)}.0</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            {current && found && view === "equipment" && (
              <div className="editor-item-variants">
                <label>
                  <span>Tier</span>
                  <WellSelect
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
                  </WellSelect>
                </label>
                <label>
                  <span>Enchantment</span>
                  <WellSelect
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
                  </WellSelect>
                </label>
                <label>
                  <span>Quality</span>
                  <WellSelect
                    aria-label={`${slot} quality`}
                    value={current.quality}
                    onChange={(event) =>
                      change({ ...current, quality: Number(event.target.value) })
                    }
                  >
                    {qualityNames.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </WellSelect>
                </label>
              </div>
            )}
            {current && view === "equipment" && (
              <section className="editor-current-abilities" aria-label={`${slot} abilities`}>
                <h3>Abilities & passives</h3>
                {abilityTiles(current)}
              </section>
            )}
            {view === "alternatives" && current && (
              <section className="editor-current-alternatives" aria-label={`${slot} swaps`}>
                <div className="editor-subhead">
                  <h3>Swaps</h3>
                  {!!current.alternatives.length && (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={current.alternatives.length >= 4}
                      aria-label={`Choose alternative ${slot}: Add alternative`}
                      onClick={() => browse(slot, "alternative")}
                    >
                      <Plus size={15} aria-hidden="true" /> Add alternative
                    </button>
                  )}
                </div>
                {current.alternatives.map((id, index) => (
                  <div className="editor-swap-row" key={`${id}-${index}`}>
                    <ItemIcon id={id} size={52} />
                    <label>
                      <span>Swap {index + 1}</span>
                      <WellSelect
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
                      </WellSelect>
                    </label>
                    <div className="editor-swap-actions">
                      <button
                        type="button"
                        className="button secondary"
                        aria-label={`Equip alternative ${slot} ${index + 1}: ${equipmentName(id)}`}
                        onClick={() => applyAlternative(id)}
                      >
                        Equip
                      </button>
                      {removeButton(
                        `Remove ${slot} alternative ${index + 1}`,
                        () =>
                          change({
                            ...current,
                            alternatives: current.alternatives.filter((_, i) => i !== index),
                          }),
                        "",
                      )}
                    </div>
                  </div>
                ))}
                {!current.alternatives.length && (
                  <EmptyWell
                    title="No swaps yet"
                    line="Add a budget option, a counter pick or a situational swap. Equip one to try it; Undo puts your loadout back."
                    action={
                      <button
                        type="button"
                        className="button secondary"
                        aria-label={`Choose alternative ${slot}: Add alternative`}
                        onClick={() => browse(slot, "alternative")}
                      >
                        <Plus size={15} aria-hidden="true" /> Add alternative
                      </button>
                    }
                  />
                )}
              </section>
            )}
            {current && view === "equipment" && (
              <Disclosure summary="Exact equipment selection">
                <label className="editor-exact-equipment">
                  <span>{slot} equipment</span>
                  <WellSelect
                    aria-label={`${slot} equipment`}
                    value={found?.family.code || ""}
                    onChange={(event) => {
                      const family = equipmentFamilies.find(
                        (f) => f.code === event.target.value && f.slot === slot,
                      );
                      change(
                        family
                          ? {
                              slot,
                              itemId: equipmentId(
                                family,
                                family.tiers.includes(found?.tier || 4)
                                  ? found?.tier || 4
                                  : family.tiers[0],
                                0,
                              ),
                              quality: current.quality,
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
                  </WellSelect>
                </label>
              </Disclosure>
            )}
          </>
        )}
        <p className="editor-game-note">
          Pick from the recorded options, then check your unlocks and current balance in game.
        </p>
      </section>
      {picker && (
        <EditorDialog open drawer title="Equipment picker" onClose={() => setPicker(null)}>
          <div className="studio-picker editor-catalog-drawer">
            <div className="studio-picker-heading">
              <h3>
                {picker === "alternative"
                  ? `Swaps for your ${slot.toLowerCase()}`
                  : `Choose your ${slot.toLowerCase()}`}
              </h3>
              <p>
                {matches.length} {matches.length === 1 ? "item" : "items"} at T{tier}.{enchant}
              </p>
            </div>
            <div className="studio-picker-toolbar">
              <label className="studio-picker-search">
                <span>Search equipment</span>
                <span className="editor-search-field">
                  <Search size={16} aria-hidden="true" />
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
                </span>
              </label>
              <label>
                <span>Tier</span>
                <WellSelect
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
                </WellSelect>
              </label>
              <label>
                <span>Enchantment</span>
                <WellSelect
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
                </WellSelect>
              </label>
            </div>
            <div className="studio-picker-grid">
              {matches.slice(page * 24, (page + 1) * 24).map((family) => {
                const id = equipmentId(family, tier, enchant);
                return (
                  <button
                    className={`studio-picker-item${current?.itemId === id ? " selected" : ""}`}
                    type="button"
                    key={id}
                    onClick={() => choose(id)}
                  >
                    <ItemIcon id={id} size={52} />
                    <span>
                      <strong>
                        <span className="sr-only">Equip </span>
                        {family.tierNames?.[tier] || family.name}
                      </strong>
                      <small>
                        T{tier}.{enchant}
                      </small>
                    </span>
                    {current?.itemId === id && <Check size={16} aria-label="Equipped" />}
                  </button>
                );
              })}
              {!matches.length && (
                <EmptyWell
                  title="Nothing matches"
                  line="No supported item matches this slot, search and tier/enchantment filters. Try another tier or clear the search."
                />
              )}
            </div>
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
