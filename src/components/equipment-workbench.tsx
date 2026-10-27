"use client";
import { abilitiesFor } from "@/lib/albion/equipment-abilities";
import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import {
  equipmentFamilies,
  equipmentSlots,
  equipmentId,
  equipmentName,
  findEquipment,
  type EquipmentSlot,
} from "@/lib/albion/equipment-catalog";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { ItemIcon } from "./item-icon";
import { EquipmentGlyph } from "./equipment-overview";
export function EquipmentWorkbench({
  value,
  onChange,
  variant = "embedded",
}: {
  value: EquipmentChoice[];
  onChange: (value: EquipmentChoice[]) => void;
  variant?: "build" | "embedded";
}) {
  const [slot, setSlot] = useState<EquipmentSlot>("Main hand"),
    [query, setQuery] = useState(""),
    [tier, setTier] = useState(() => {
      const equipped = value.find((e) => e.slot === "Main hand");
      return (equipped && findEquipment(equipped.itemId)?.tier) || 4;
    }),
    [enchant, setEnchant] = useState(() => {
      const equipped = value.find((e) => e.slot === "Main hand");
      return (equipped && findEquipment(equipped.itemId)?.enchantment) || 0;
    }),
    [view, setView] = useState("equipment");
  const [swapQuery, setSwapQuery] = useState("");
  const [browserPage, setBrowserPage] = useState({ key: "", index: 0 });
  const [notice, setNotice] = useState("");
  const [previous, setPrevious] = useState<EquipmentChoice[] | null>(null);
  const studio = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);
  const paneId = useId();
  function showView(next: string) {
    focusRequested.current = true;
    setView(next);
  }
  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    if (!window.matchMedia("(max-width: 780px)").matches) return;
    const selector =
      view === "browser"
        ? ".gear-search input"
        : view === "details"
          ? ".gear-details select"
          : '.character-slot[aria-pressed="true"]';
    studio.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [view, slot]);
  const current = value.find((e) => e.slot === slot),
    found = current ? findEquipment(current.itemId) : null;
  const families = equipmentFamilies.filter(
    (f) =>
      f.slot === slot &&
      f.name.toLowerCase().includes(query.toLowerCase()) &&
      f.tiers.includes(tier) &&
      f.enchants.includes(enchant) &&
      !!findEquipment(equipmentId(f, tier, enchant)),
  );
  const browserKey = `${slot}:${query}:${tier}:${enchant}`;
  const pageIndex = browserPage.key === browserKey ? browserPage.index : 0;
  const shownFamilies = families.slice(pageIndex * 12, pageIndex * 12 + 12);
  const swapCandidates = equipmentFamilies
    .filter((f) => f.slot === slot)
    .flatMap((f) => f.tiers.flatMap((t) => f.enchants.map((e) => equipmentId(f, t, e))))
    .filter(
      (id) =>
        id !== current?.itemId &&
        !!findEquipment(id) &&
        swapQuery
          .toLowerCase()
          .split(/\s+/)
          .every((term) => `${equipmentName(id)} ${id}`.toLowerCase().includes(term)),
    )
    .sort(
      (a, b) =>
        Number(findEquipment(b)?.family.code === found?.family.code) -
        Number(findEquipment(a)?.family.code === found?.family.code),
    );
  function selectSlot(next: EquipmentSlot) {
    setSlot(next);
    setQuery("");
    setSwapQuery("");
    const equipped = value.find((e) => e.slot === next);
    const info = equipped ? findEquipment(equipped.itemId) : null;
    const family = info?.family || equipmentFamilies.find((f) => f.slot === next);
    if (family) {
      setTier(info?.tier || (family.tiers.includes(tier) ? tier : family.tiers[0]));
      setEnchant(info?.enchantment ?? (family.enchants.includes(enchant) ? enchant : 0));
    }
  }
  function change(next: EquipmentChoice | null) {
    const main = value.find((e) => e.slot === "Main hand");
    if (next?.slot === "Off hand" && main && findEquipment(main.itemId)?.family.twoHanded) {
      setNotice("Choose a one-handed weapon before adding an off hand.");
      return;
    }
    let rows = value.filter((e) => e.slot !== slot);
    if (
      next?.slot === "Main hand" &&
      findEquipment(next.itemId)?.family.twoHanded &&
      rows.some((e) => e.slot === "Off hand")
    ) {
      setPrevious(structuredClone(value));
      rows = rows.filter((e) => e.slot !== "Off hand");
      setNotice("Off hand cleared: this weapon uses both hands.");
    } else setNotice("");
    if (next) {
      const itemId = next.itemId;
      const options = abilitiesFor(itemId);
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
  function choose(code: string) {
    const f = equipmentFamilies.find((f) => f.code === code && f.slot === slot);
    change(
      f
        ? {
            slot,
            itemId: findEquipment(equipmentId(f, tier, enchant))
              ? equipmentId(f, tier, enchant)
              : equipmentId(f, f.tiers[0], 0),
            quality: current?.quality || 1,
            abilities: {},
            alternatives: [],
          }
        : null,
    );
    showView("details");
  }
  return (
    <div ref={studio} className={`gear-studio${variant === "build" ? " build-gear-studio" : ""}`}>
      {notice && (
        <div className="gear-change-notice" role="status">
          {notice}
          {previous && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                onChange(previous);
                setPrevious(null);
                setNotice("");
              }}
            >
              Undo equipment change
            </button>
          )}
        </div>
      )}
      <nav className="gear-mobile-nav" aria-label="Equipment views">
        {[
          ["equipment", "Equipment"],
          ["browser", "Browse items"],
          ["details", "Item details"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={view === key}
            aria-controls={`${paneId}-${key}`}
            onClick={() => showView(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <section
        id={`${paneId}-browser`}
        className={`gear-browser gear-pane${view === "browser" ? " mobile-active" : ""}`}
        aria-label="Equipment browser"
      >
        <div className="studio-heading">
          <h2>Item browser</h2>
          <p className="gear-browser-context">
            {slot} · {families.length} supported {families.length === 1 ? "family" : "families"}
          </p>
        </div>
        <label className="gear-search">
          <span>Search equipment</span>
          <div>
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item names…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (families[0]) choose(families[0].code);
                }
              }}
            />
          </div>
        </label>
        <label className="gear-category-select">
          Equipment category
          <select
            aria-label="Equipment category"
            value={slot}
            onChange={(e) => {
              selectSlot(e.target.value as EquipmentSlot);
            }}
          >
            {equipmentSlots.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <nav className="gear-category-nav" aria-label="Equipment slot categories">
          {equipmentSlots.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={slot === category}
              onClick={() => {
                selectSlot(category);
              }}
            >
              <EquipmentGlyph slot={category} />
              <span>{category}</span>
            </button>
          ))}
        </nav>
        <div className="gear-browser-filters">
          <label>
            Tier
            <select
              aria-label="Browse tier"
              value={tier}
              onChange={(e) => setTier(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Enchantment
            <select
              aria-label="Browse enchantment"
              value={enchant}
              onChange={(e) => setEnchant(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map((t) => (
                <option key={t} value={t}>
                  .{t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="item-browser-grid">
          {shownFamilies.map((f) => {
            const id = equipmentId(
              f,
              f.tiers.includes(tier) ? tier : f.tiers[0],
              f.enchants.includes(enchant) ? enchant : 0,
            );
            return (
              <button
                type="button"
                key={f.code}
                className={`item-browser-choice${found?.family.code === f.code ? " selected" : ""}`}
                aria-pressed={found?.family.code === f.code}
                onClick={() => choose(f.code)}
              >
                <span className="sr-only">Equip </span>
                <ItemIcon id={id} size={72} />
                <span>{f.tierNames?.[tier] || f.name}</span>
                <small>
                  {id.match(/^T\d/)?.[0]}.{id.match(/@(\d)$/)?.[1] || 0}
                </small>
              </button>
            );
          })}
        </div>
        {!families.length && (
          <p className="gear-coverage">
            No supported item matches this slot, search and tier/enchantment filters. Unavailable
            variants are not invented.
          </p>
        )}
        {families.length > 12 && (
          <div className="actions gear-browser-paging" aria-label="Equipment results pages">
            <button
              type="button"
              className="button secondary"
              disabled={pageIndex === 0}
              onClick={() => setBrowserPage({ key: browserKey, index: pageIndex - 1 })}
            >
              Previous items
            </button>
            <span>
              {pageIndex * 12 + 1}–{Math.min(families.length, (pageIndex + 1) * 12)} of{" "}
              {families.length}
            </span>
            <button
              type="button"
              className="button secondary"
              disabled={(pageIndex + 1) * 12 >= families.length}
              onClick={() => setBrowserPage({ key: browserKey, index: pageIndex + 1 })}
            >
              Next items
            </button>
          </div>
        )}
        <details className="gear-catalog-coverage">
          <summary>Source catalog · {equipmentFamilies.length} families</summary>
          <p className="gear-coverage">
            Other equipment and unlock requirements await verified data. The build’s advanced fields
            retain manual IDs and notes.
          </p>
        </details>
      </section>
      <section
        id={`${paneId}-equipment`}
        className={`gear-character gear-pane${view === "equipment" ? " mobile-active" : ""}`}
        aria-label="Character equipment"
      >
        <div className="studio-heading">
          <h2>Equipment</h2>
          <p>Choose a slot, then equip an item.</p>
        </div>
        <div className="gear-selection-context">
          <EquipmentGlyph slot={slot} />
          <div>
            <span>{slot}</span>
            <strong>{found?.family.name || "Choose equipment"}</strong>
          </div>
          <span className="numeric">{value.length}/10</span>
        </div>
        <div className="character-slots">
          {equipmentSlots.map((s) => {
            const e = value.find((e) => e.slot === s),
              info = e ? findEquipment(e.itemId) : null;
            return (
              <button
                type="button"
                key={s}
                data-slot={s}
                className={`character-slot${e ? " equipped" : ""}${s === slot ? " selected" : ""}`}
                aria-pressed={s === slot}
                title={
                  e ? `${equipmentName(e.itemId)} · Quality ${e.quality}` : `${s} · Empty slot`
                }
                onClick={() => {
                  selectSlot(s);
                  showView("browser");
                }}
              >
                <span className="sr-only">Select {s} slot: </span>
                <span className="slot-caption">{s}</span>
                {e ? (
                  <ItemIcon id={e.itemId} quality={e.quality} size={72} />
                ) : (
                  <EquipmentGlyph slot={s} />
                )}
                <span className="slot-item-name">
                  {info?.family.name || (e ? e.itemId : "Empty")}
                </span>
                {info && (
                  <span className="slot-tier">
                    T{info.tier}.{info.enchantment}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {current && Object.keys(current.abilities).length > 0 && (
          <div className="loadout-ability-summary" aria-label="Selected item abilities">
            {Object.entries(current.abilities)
              .sort(
                ([a], [b]) =>
                  ["Q", "W", "E", "Active", "Passive"].indexOf(a) -
                  ["Q", "W", "E", "Active", "Passive"].indexOf(b),
              )
              .map(([key, name]) => (
                <span key={key}>
                  <b>{key === "Passive" ? "P" : key}</b>
                  {name}
                </span>
              ))}
          </div>
        )}
        <div className="loadout-summary">
          <span>{value.length} / 10 equipped</span>
          <span>Selected: {slot}</span>
        </div>
      </section>
      <section
        id={`${paneId}-details`}
        className={`gear-details gear-pane${view === "details" ? " mobile-active" : ""}`}
        aria-label="Selected equipment details"
      >
        <div className="studio-heading">
          <h2>{found?.family.name || slot}</h2>
        </div>
        {current && (
          <div className="selected-gear-heading">
            <ItemIcon id={current.itemId} quality={current.quality} size={80} />
            <div>
              <strong>{equipmentName(current.itemId)}</strong>
              <small>
                {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][current.quality - 1]}
              </small>
            </div>
          </div>
        )}
        <label>
          {slot} equipment
          <select
            aria-label={`${slot} equipment`}
            value={found?.family.code || ""}
            onChange={(e) => choose(e.target.value)}
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
        {current && found ? (
          <>
            <div className="gear-options">
              <label>
                Tier
                <select
                  aria-label={`${slot} tier`}
                  value={found.tier}
                  onChange={(e) =>
                    change({
                      ...current,
                      itemId: equipmentId(found.family, Number(e.target.value), found.enchantment),
                    })
                  }
                >
                  {found.family.tiers
                    .filter((t) => !!findEquipment(equipmentId(found.family, t, found.enchantment)))
                    .map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                </select>
              </label>
              <label>
                Enchant
                <select
                  aria-label={`${slot} enchantment`}
                  value={found.enchantment}
                  onChange={(e) =>
                    change({
                      ...current,
                      itemId: equipmentId(found.family, found.tier, Number(e.target.value)),
                    })
                  }
                >
                  {found.family.enchants
                    .filter((t) => !!findEquipment(equipmentId(found.family, found.tier, t)))
                    .map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                </select>
              </label>
              <label>
                Quality
                <select
                  aria-label={`${slot} quality`}
                  value={current.quality}
                  onChange={(e) => change({ ...current, quality: Number(e.target.value) })}
                >
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((q, i) => (
                    <option key={q} value={i + 1}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <h3 className="ability-heading">Abilities & passives</h3>
            <p className="gear-coverage">
              July 2026 source options and retained starter references. Character unlocks, tier
              restrictions and current-patch availability need in-game confirmation.
            </p>
            {Object.entries(abilitiesFor(current.itemId)).map(([key, choices]) => (
              <label className="ability-choice" key={key}>
                <span className="ability-key" aria-hidden="true">
                  {key === "Passive" ? "P" : key === "Active" ? "A" : key}
                </span>
                <span>
                  {key === "Passive" ? "Passive" : `${key} ability`}
                  <select
                    aria-label={`${slot} ${key}`}
                    value={current.abilities[key] || ""}
                    onChange={(e) => {
                      const abilities = { ...current.abilities };
                      if (e.target.value) abilities[key] = e.target.value;
                      else delete abilities[key];
                      change({ ...current, abilities });
                    }}
                  >
                    <option value="">Not specified</option>
                    {choices.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </span>
              </label>
            ))}
            {!Object.keys(abilitiesFor(current.itemId)).length && (
              <p className="gear-coverage">No ability selection is recorded for this equipment.</p>
            )}
            <div className="gear-alternatives">
              <h3>Equipment swaps</h3>
              <label>
                Filter swaps
                <input
                  value={swapQuery}
                  onChange={(e) => setSwapQuery(e.target.value)}
                  placeholder="Item name, tier or ID"
                />
              </label>
              <p className="gear-coverage">
                {swapCandidates.length} matching variants. Showing up to 200; filter by name or tier
                for more.
              </p>
              {current.alternatives.length > 0 && (
                <div className="gear-swap-previews" aria-label="Saved equipment alternatives">
                  {current.alternatives.map((id) => (
                    <span key={id} title={equipmentName(id)}>
                      <ItemIcon id={id} quality={current.quality} size={40} />
                      <small>{equipmentName(id)}</small>
                    </span>
                  ))}
                </div>
              )}
              {(current.alternatives.length ? current.alternatives : [""]).map(
                (alternative, index) => (
                  <label key={index}>
                    {index === 0 ? "Alternative equipment" : `Alternative ${index + 1}`}
                    <select
                      aria-label={`${slot} alternative${index ? ` ${index + 1}` : ""}`}
                      value={alternative}
                      onChange={(e) => {
                        const alternatives = [...current.alternatives];
                        if (e.target.value) alternatives[index] = e.target.value;
                        else alternatives.splice(index, 1);
                        change({ ...current, alternatives });
                      }}
                    >
                      <option value="">None</option>
                      {[
                        ...new Set([
                          ...(alternative ? [alternative] : []),
                          ...swapCandidates.slice(0, 200),
                        ]),
                      ].map((id) => (
                        <option key={id} value={id}>
                          {equipmentName(id)}
                        </option>
                      ))}
                    </select>
                  </label>
                ),
              )}
              {current.alternatives.length > 0 && current.alternatives.length < 4 && (
                <label>
                  Add a swap
                  <select
                    aria-label={`${slot} add alternative`}
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        change({
                          ...current,
                          alternatives: [...current.alternatives, e.target.value],
                        });
                    }}
                  >
                    <option value="">Choose equipment…</option>
                    {equipmentFamilies
                      .filter((f) => f.slot === slot)
                      .flatMap((f) =>
                        f.tiers.flatMap((t) =>
                          f.enchants.map((enchantment) => equipmentId(f, t, enchantment)),
                        ),
                      )
                      .filter((id) => !current.alternatives.includes(id) && id !== current.itemId)
                      .map((id) => (
                        <option key={id} value={id}>
                          {equipmentName(id)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
            {Object.keys(found.family.abilities).length > 0 && (
              <p className="gear-coverage">
                Source spell options unavailable here; mastery unlock requirements are unverified.
              </p>
            )}
            <p className="gear-coverage">{current.itemId} · No inferred combat statistics.</p>
            <button type="button" className="button secondary" onClick={() => change(null)}>
              <X size={16} /> Remove {slot}
            </button>
          </>
        ) : (
          <p className="gear-details-empty">
            Select a piece from the item browser to see its quality, abilities and swaps here.
          </p>
        )}
      </section>
    </div>
  );
}
