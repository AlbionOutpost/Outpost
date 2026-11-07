"use client";
import { useState } from "react";
import { Swords } from "lucide-react";
import Link from "./build-region-link";
import { ItemIcon } from "./item-icon";
import { SearchInput } from "./field";
export function BuildWeaponRail({
  families,
  weapons,
  selected,
  total,
  query,
  limit,
}: {
  families: readonly { id: string; name: string; count: number }[];
  weapons: readonly { family: string; itemId: string }[];
  selected: string;
  /** The library's totals, shown only when the list is the library: player builds have no count. */
  total?: number;
  query: Record<string, string>;
  /** Show this many families until the player asks for all (the selected one always shows). */
  limit?: number;
}) {
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(false);
  const matching = families.filter((f) =>
    f.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const short = !!limit && !all && !search.trim() && matching.length > limit;
  const visible = short ? matching.filter((f, i) => i < limit || f.id === selected) : matching;
  const href = (family: string) =>
    `/builds?${new URLSearchParams({ ...query, family, weapon: "", page: "1" })}`;
  return (
    <section className="build-weapon-rail" aria-label="Weapon families">
      <div className="weapon-rail-heading">
        <h2>Weapons</h2>
      </div>
      <label className="weapon-rail-search">
        <span className="sr-only">Search weapon families</span>
        <SearchInput
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a weapon family…"
        />
      </label>
      <input type="hidden" name="family" value={selected} />
      <nav aria-label="Filter by weapon family">
        <Link href={href("")} aria-current={!selected ? "page" : undefined}>
          <Swords size={22} />
          <span>All weapons</span>{" "}
          {total !== undefined && <small>{total.toLocaleString("en-GB")}</small>}
        </Link>
        {visible.map((f) => {
          const item = weapons.find((w) => w.family === f.id)?.itemId;
          return (
            <Link
              key={f.id}
              aria-label={
                total !== undefined
                  ? `Filter by ${f.name} ${f.count.toLocaleString("en-GB")}`
                  : `Filter by ${f.name}`
              }
              href={href(f.id)}
              aria-current={selected === f.id ? "page" : undefined}
            >
              {item ? <ItemIcon id={item} size={26} /> : <Swords size={22} />}
              <span>{f.name}</span>{" "}
              {total !== undefined && <small>{f.count.toLocaleString("en-GB")}</small>}
            </Link>
          );
        })}
      </nav>
      {short && (
        <button
          type="button"
          className="pill-link is-small weapon-rail-more"
          onClick={() => setAll(true)}
        >
          Show all {matching.length} families
        </button>
      )}
      {!visible.length && <p role="status">No matching family. Try axe, bow or staff.</p>}
    </section>
  );
}
