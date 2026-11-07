"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, ShieldAlert, Trash2 } from "lucide-react";
import {
  equipmentFamilies,
  equipmentId,
  findEquipment,
  type EquipmentSlot,
} from "@/lib/albion/equipment-catalog";
import { buildDiscovery } from "@/lib/build-discovery";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { EditorDialog } from "./editor-dialog";
import { EmptyWell } from "./empty-well";
import { SearchInput } from "./field";
import { ItemIcon } from "./item-icon";
import { WellSelect } from "./well-select";

const PAGE = 24;
const RECENT_KEY = "outpost-recent-equipment-v1";
/** Library build counts and weapon lines, for the "most built" row and the weapon filter. */
const weaponInfo = new Map(buildDiscovery.weapons.map((w) => [w.code, w]));
const weaponLines = buildDiscovery.families.filter((line) =>
  equipmentFamilies.some(
    (f) => f.slot === "Main hand" && weaponInfo.get(f.code)?.family === line.id,
  ),
);

function readRecent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}
function rememberRecent(code: string) {
  try {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([code, ...readRecent().filter((c) => c !== code)].slice(0, 12)),
    );
  } catch {
    // Recent picks are a convenience; private windows simply don't keep them.
  }
}

/** Arrow keys walk the item grid by its rendered columns; Home and End jump to its ends. */
function gridKeys(event: KeyboardEvent<HTMLElement>) {
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  const columns = Math.max(1, buttons.filter((b) => b.offsetTop === buttons[0].offsetTop).length);
  const step: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: columns,
    ArrowUp: -columns,
    Home: -index,
    End: buttons.length - 1 - index,
  };
  if (!(event.key in step)) return;
  event.preventDefault();
  buttons[Math.min(buttons.length - 1, Math.max(0, index + step[event.key]))]?.focus();
}

/**
 * The one way to fill a slot: the board's slot opens this modal with every item that fits,
 * recent and most-built picks first. Equip mode replaces the piece; swap mode adds the pick to
 * the piece's alternatives.
 */
export function EquipmentSlotDialog({
  slot,
  mode,
  current,
  blocked,
  onMode,
  onChoose,
  onRemove,
  onSlot,
  onClose,
}: {
  slot: EquipmentSlot;
  mode: "recommended" | "alternative";
  current?: EquipmentChoice;
  /** The off hand while a two-handed weapon holds it. */
  blocked: boolean;
  onMode: (mode: "recommended" | "alternative") => void;
  onChoose: (id: string) => void;
  onRemove: () => void;
  onSlot: (slot: EquipmentSlot) => void;
  onClose: () => void;
}) {
  const info = current ? findEquipment(current.itemId) : null;
  const starter = equipmentFamilies.find((f) => f.slot === slot);
  const [query, setQuery] = useState("");
  const [line, setLine] = useState("");
  const [tier, setTier] = useState(
    info?.tier || (starter?.tiers.includes(4) ? 4 : starter?.tiers[0] || 4),
  );
  const [enchant, setEnchant] = useState(info?.enchantment || 0);
  const [page, setPage] = useState(0);
  // Only ever opened by a click, so reading the browser's storage on first render is safe
  const [recent] = useState(readRecent);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const swapping = mode === "alternative" && !!current;
  const weapons = slot === "Main hand";
  const matches = equipmentFamilies.filter(
    (f) =>
      f.slot === slot &&
      `${f.name} ${f.code}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!line || weaponInfo.get(f.code)?.family === line) &&
      !!findEquipment(equipmentId(f, tier, enchant)) &&
      (!swapping || equipmentId(f, tier, enchant) !== current?.itemId),
  );
  // Recent picks, then the weapons most library builds use; only while browsing unfiltered,
  // so a search or filter always reads as one plain list.
  const featured =
    query.trim() || line
      ? []
      : [
          ...matches
            .filter((f) => recent.includes(f.code))
            .sort((a, b) => recent.indexOf(a.code) - recent.indexOf(b.code)),
          ...matches
            .filter((f) => weapons && !recent.includes(f.code) && weaponInfo.get(f.code)?.count)
            .sort((a, b) => weaponInfo.get(b.code)!.count - weaponInfo.get(a.code)!.count),
        ].slice(0, 8);
  const rest = matches.filter((f) => !featured.includes(f));
  const choose = (code: string, id: string) => {
    rememberRecent(code);
    onChoose(id);
  };
  const tile = (family: (typeof matches)[number]) => {
    const id = equipmentId(family, tier, enchant);
    const equipped = current?.itemId === id;
    return (
      <button
        className={`studio-picker-item${equipped ? " selected" : ""}`}
        type="button"
        key={id}
        onClick={() => choose(family.code, id)}
      >
        <ItemIcon id={id} size={64} />
        <span>
          <strong>
            <span className="sr-only">Equip </span>
            {family.tierNames?.[tier] || family.name}
          </strong>
          <small>
            T{tier}.{enchant}
          </small>
        </span>
        {equipped && <Check size={16} aria-label="Equipped" />}
      </button>
    );
  };
  const title = swapping
    ? `Swaps for your ${slot.toLowerCase()}`
    : `Choose your ${slot.toLowerCase()}`;
  const filters = (
    <>
      <label className="studio-picker-search">
        <span>Search equipment</span>
        <SearchInput
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
      {weapons && (
        <label>
          <span>Weapon line</span>
          <WellSelect
            aria-label="Weapon line"
            value={line}
            onChange={(event) => {
              setLine(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Every weapon</option>
            {weaponLines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </WellSelect>
        </label>
      )}
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
              {e ? `@${e}` : "Flat"}
            </option>
          ))}
        </WellSelect>
      </label>
    </>
  );
  return (
    <EditorDialog open title={title} className="slot-picker-dialog" onClose={onClose}>
      <div className="studio-picker editor-catalog-drawer">
        {blocked ? (
          <div className="slot-picker-body">
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
                  onClick={() => onSlot("Main hand")}
                >
                  Choose main hand <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {current && (
              <div className="slot-picker-current">
                <ItemIcon id={current.itemId} quality={current.quality} size={48} />
                <div>
                  <small>In this slot</small>
                  <strong>
                    {info ? info.family.tierNames?.[info.tier] || info.family.name : current.itemId}
                  </strong>
                </div>
                <div className="segmented" role="group" aria-label="What a pick does">
                  <button
                    type="button"
                    aria-pressed={!swapping}
                    onClick={() => onMode("recommended")}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    aria-pressed={swapping}
                    disabled={!swapping && current.alternatives.length >= 4}
                    onClick={() => onMode("alternative")}
                  >
                    Add as swap
                  </button>
                </div>
                <button
                  type="button"
                  className="button secondary editor-remove-item is-icon"
                  aria-label={`Take off ${slot}`}
                  title="Take it off"
                  onClick={onRemove}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="studio-picker-toolbar">{filters}</div>
            <div className="slot-picker-body">
              <p className="studio-picker-heading">
                {matches.length} {matches.length === 1 ? "item fits" : "items fit"} at T{tier}.
                {enchant}
                {swapping ? " · a pick is added as a swap" : ""}
              </p>
              {!!featured.length && !page && (
                <section aria-label="Recent and most built">
                  <h3 className="slot-picker-label">
                    {weapons ? "Recent and most built" : "Recent"}
                  </h3>
                  <div className="studio-picker-grid" onKeyDown={gridKeys}>
                    {featured.map(tile)}
                  </div>
                </section>
              )}
              {!!rest.length && (
                <section aria-label="Every item">
                  {!!featured.length && !page && <h3 className="slot-picker-label">Every item</h3>}
                  <div className="studio-picker-grid" onKeyDown={gridKeys}>
                    {rest.slice(page * PAGE, (page + 1) * PAGE).map(tile)}
                  </div>
                </section>
              )}
              {!matches.length && (
                <EmptyWell
                  title="Nothing matches"
                  line="No supported item matches this slot, search and tier/enchantment filters. Try another tier or clear the search."
                />
              )}
            </div>
            {rest.length > PAGE && (
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
                  {page * PAGE + 1}–{Math.min((page + 1) * PAGE, rest.length)} of {rest.length}
                </span>
                <button
                  type="button"
                  className="button secondary"
                  disabled={(page + 1) * PAGE >= rest.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next items
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </EditorDialog>
  );
}
