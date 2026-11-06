"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
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
import { InventoryEquipmentBoard } from "./inventory-equipment-board";
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
}: {
  value: EquipmentChoice[];
  onChange: (value: EquipmentChoice[]) => void;
  view?: BuildStudioView;
  captureUndo?: () => () => void;
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
  const options = current ? abilitiesFor(current.itemId) : {};
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
  const inventory = value.map((item) => {
    const info = findEquipment(item.itemId);
    const spells = archivedSpellOptions(item.itemId);
    return {
      ...item,
      name: equipmentName(item.itemId),
      tierLabel: info ? `T${info.tier}.${info.enchantment}` : undefined,
      qualityLabel: qualityNames[item.quality - 1],
      spells: Object.entries(item.abilities).map(([key, name]) => ({
        key,
        name,
        id: spells.find((spell) => spell.key === key && spell.name === name)?.id,
      })),
      alternativeItemId: item.alternatives[0],
    };
  });
  const abilityControls = current && (
    <div
      className="studio-spell-choices editor-ability-choices"
      aria-label={`${slot} abilities & passives`}
    >
      {Object.entries(options).map(([key, choices]) => {
        const name = current.abilities[key];
        const spell = archivedSpellOptions(current.itemId).find(
          (s) => s.key === key && s.name === name,
        );
        return (
          <label key={key} className={`editor-ability-choice${name ? " chosen" : ""}`}>
            <span className="editor-ability-art">
              {spell ? (
                <SpellIcon id={spell.id} name={name!} size={42} />
              ) : (
                <span>{key === "Passive" ? "P" : key === "Active" ? "A" : key}</span>
              )}
            </span>
            <span>
              <small>{key === "Passive" ? "Passive" : `${key} ability`}</small>
              <WellSelect
                aria-label={`${slot} ${key}`}
                value={name || ""}
                onChange={(event) => {
                  const abilities = { ...current.abilities };
                  if (event.target.value) abilities[key] = event.target.value;
                  else delete abilities[key];
                  change({ ...current, abilities });
                }}
              >
                <option value="">Choose {key === "Passive" ? "passive" : `${key} ability`}</option>
                {choices.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </WellSelect>
            </span>
          </label>
        );
      })}
      {!Object.keys(options).length && (
        <p className="editor-muted">This item has no abilities to choose.</p>
      )}
    </div>
  );
  // An empty slot shows the first T4 pieces for it in place, so the inspector is never blank
  const starterTier = (family: (typeof equipmentFamilies)[number]) =>
    family.tiers.includes(4) ? 4 : family.tiers[0];
  const starters = current
    ? []
    : equipmentFamilies
        .filter((f) => f.slot === slot && !!findEquipment(equipmentId(f, starterTier(f), 0)))
        .slice(0, 8);
  const slotLine = blocked
    ? "Held by your two-handed main hand."
    : !current
      ? "Nothing equipped in this slot yet."
      : view === "abilities"
        ? "Pick the abilities this piece runs."
        : view === "alternatives"
          ? "Up to four swaps for this slot."
          : found
            ? `T${found.tier}.${found.enchantment} · ${qualityNames[current.quality - 1]}`
            : qualityNames[current.quality - 1];

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
          line="Select a slot to edit it."
          actions={<span className="landing-chip is-muted">{value.length}/10 equipped</span>}
        />
        <button
          type="button"
          className="editor-selection-jump"
          onClick={() => {
            const panel = document.getElementById("editor-selected-slot");
            panel?.focus({ preventScroll: true });
            panel?.scrollIntoView({ block: "start", behavior: "instant" });
          }}
        >
          <span>
            <small>Editing {slot}</small>
            <strong>{current ? equipmentName(current.itemId) : "Choose equipment"}</strong>
          </span>
          <ArrowDown size={16} aria-hidden="true" />
        </button>
        <InventoryEquipmentBoard
          equipment={inventory}
          selectedSlot={slot}
          onSelectSlot={(target) => {
            if (equipmentSlots.includes(target as EquipmentSlot))
              selectSlot(target as EquipmentSlot);
          }}
          label="Editor equipment inventory"
        />
        <p className="editor-inventory-note">
          {twoHanded
            ? "Two-handed weapon: it holds the off hand too."
            : "Weapons, armour, consumables and your mount."}
        </p>
      </aside>
      <section
        className="raised editor-slot-panel studio-loadout-list"
        id="editor-selected-slot"
        tabIndex={-1}
        aria-label="Selected equipment configuration"
      >
        <PanelHead title={slot} line={slotLine} />
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
        {blocked ? (
          <div className="editor-selected-item is-blocked">
            <span className="editor-empty-art" aria-hidden="true">
              <ShieldAlert size={26} />
            </span>
            <div>
              <strong>Your weapon uses both hands</strong>
              <small>Switch to a one-handed weapon to equip an off hand.</small>
            </div>
            <button type="button" className="button secondary" onClick={() => setSlot("Main hand")}>
              Inspect main hand <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <div className={`editor-selected-item${current ? " equipped" : ""}`}>
              {current ? (
                <ItemIcon id={current.itemId} quality={current.quality} size={64} />
              ) : (
                <span className="editor-empty-art" aria-hidden="true">
                  <Plus size={26} />
                </span>
              )}
              <div>
                <strong>
                  {current ? equipmentName(current.itemId) : `Choose your ${slot.toLowerCase()}`}
                </strong>
                <small>
                  {current && found
                    ? `T${found.tier}.${found.enchantment} · ${qualityNames[current.quality - 1]}`
                    : "Empty slot"}
                </small>
              </div>
              <div className="editor-item-actions">
                <button
                  type="button"
                  className={`button ${current ? "secondary" : "primary"}`}
                  aria-label={`Choose ${slot} equipment: ${current ? equipmentName(current.itemId) : "Empty"}. ${current ? "Change item" : "Choose item"}`}
                  onClick={() => browse(slot)}
                >
                  {current ? "Change item" : "Choose item"} <ArrowRight size={15} />
                </button>
                {current && (
                  <button
                    type="button"
                    className="button secondary editor-remove-item"
                    aria-label={`Remove ${slot}`}
                    onClick={() => change(null)}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Remove
                  </button>
                )}
              </div>
            </div>
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
                        <ItemIcon id={id} size={44} />
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
            {(view === "abilities" || view === "equipment") && current && (
              <section className="editor-current-abilities" aria-label={`${slot} abilities`}>
                <h3>Abilities</h3>
                {abilityControls}
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
                      <button
                        type="button"
                        className="button secondary editor-icon-button"
                        aria-label={`Remove ${slot} alternative ${index + 1}`}
                        onClick={() =>
                          change({
                            ...current,
                            alternatives: current.alternatives.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
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
                    <ItemIcon id={id} size={56} />
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
