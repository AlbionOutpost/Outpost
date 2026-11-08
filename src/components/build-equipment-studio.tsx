"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Plus, ShieldAlert, Trash2, Undo2 } from "lucide-react";
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
import { EquipmentSlotDialog } from "./equipment-slot-dialog";
import { LoadoutBoard } from "./loadout-board";
import { ItemIcon } from "./item-icon";
import { SpellIcon } from "./spell-icon";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { Disclosure } from "./disclosure";
import { WellSelect } from "./well-select";

/** Loadout picks pieces and their abilities; Alternatives works on each slot's swaps. */
export type BuildStudioView = "equipment" | "alternatives";
const qualityNames = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];

export function BuildEquipmentStudio({
  value,
  onChange,
  view = "equipment",
  captureUndo,
  boardEmpty,
  flaggedSlot,
  cost,
}: {
  value: EquipmentChoice[];
  onChange: (value: EquipmentChoice[]) => void;
  view?: BuildStudioView;
  captureUndo?: () => () => void;
  /** Shown under the board while nothing is equipped, such as the starting sets. */
  boardEmpty?: ReactNode;
  /** A slot to mark, such as a missing main hand after a failed save. */
  flaggedSlot?: string;
  /** The cost panel: left of the board on wide screens, last on phones. */
  cost?: ReactNode;
}) {
  const [slot, setSlot] = useState<EquipmentSlot>("Main hand");
  const [picker, setPicker] = useState<"recommended" | "alternative" | null>(null);
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<{
    equipment: EquipmentChoice[];
    restore?: () => void;
  } | null>(null);
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
    setSlot(target);
    setPicker(mode);
  }
  /** The board is the one place to pick: an empty slot opens the picker, a filled one is
   * selected so its abilities show beside the board, and the selected piece opens the picker
   * again to replace it. A slot held by a two-handed weapon is only selected. */
  const opensPicker = (target: string) =>
    !(target === "Off hand" && twoHanded) &&
    (target === slot || !value.some((row) => row.slot === target));
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
  const itemRow = current && (
    <div className="editor-selected-item equipped">
      <ItemIcon id={current.itemId} quality={current.quality} size={64} />
      <div>
        <strong>{pieceName(current.itemId)}</strong>
        <small>
          {slot} · {pieceLine(current)}
        </small>
      </div>
      <div className="editor-item-actions">
        <button
          type="button"
          className="button secondary"
          aria-label={`Change item in ${slot}: ${equipmentName(current.itemId)}`}
          onClick={() => browse(slot)}
        >
          Change item <ArrowRight size={15} aria-hidden="true" />
        </button>
        {removeButton(`Remove ${slot}`, () => change(null))}
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
              : "Pick a slot to choose its piece."
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
          opensPicker={opensPicker}
          onSelectSlot={(target) => {
            if (!equipmentSlots.includes(target as EquipmentSlot)) return;
            if (opensPicker(target)) browse(target as EquipmentSlot);
            else selectSlot(target as EquipmentSlot);
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
        <PanelHead
          title={view === "alternatives" ? "Swaps" : "Abilities"}
          line={
            blocked
              ? "Your off hand is held by the two-handed main hand."
              : !current
                ? `Your ${slot.toLowerCase()} is empty.`
                : view === "alternatives"
                  ? `Up to four swaps for your ${slot.toLowerCase()}.`
                  : `Tier, quality and abilities of your ${slot.toLowerCase()}.`
          }
        />
        {blocked ? (
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
        ) : !current ? (
          <EmptyWell
            title={
              value.length ? `Nothing in your ${slot.toLowerCase()} yet` : "Pick your first piece"
            }
            line={
              value.length
                ? "Choose a piece; its tier, quality and abilities show here."
                : "Select a slot on the board. Its tier, quality and abilities show here."
            }
            action={
              <button type="button" className="button secondary" onClick={() => browse(slot)}>
                <Plus size={15} aria-hidden="true" /> Choose a {slot.toLowerCase()}
              </button>
            }
          />
        ) : (
          <>
            {itemRow}
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
                          {e ? `@${e}` : "Flat"}
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
                {abilityTiles(current)}
              </section>
            )}
            {view === "alternatives" && current && (
              <section className="editor-current-alternatives" aria-label={`${slot} swaps`}>
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
                {!!current.alternatives.length && (
                  <button
                    type="button"
                    className="button secondary editor-add-row"
                    disabled={current.alternatives.length >= 4}
                    aria-label={`Choose alternative ${slot}: Add alternative`}
                    onClick={() => browse(slot, "alternative")}
                  >
                    <Plus size={15} aria-hidden="true" /> Add alternative
                  </button>
                )}
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
      {cost}
      {picker && (
        <EquipmentSlotDialog
          key={slot}
          slot={slot}
          mode={picker}
          current={current}
          blocked={blocked}
          onMode={setPicker}
          onChoose={choose}
          onRemove={() => {
            change(null, slot, { undoable: true, message: `${slot} taken off.` });
            setPicker(null);
          }}
          onSlot={(target) => browse(target)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
