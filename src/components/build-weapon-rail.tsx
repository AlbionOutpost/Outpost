"use client";
import { useState } from "react";
import { Search, Swords } from "lucide-react";
import Link from "./build-region-link";
import { ItemIcon } from "./item-icon";
export function BuildWeaponRail({
  families,
  weapons,
  selected,
  total,
  query,
}: {
  families: readonly { id: string; name: string; count: number }[];
  weapons: readonly { family: string; itemId: string }[];
  selected: string;
  total: number;
  query: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const visible = families.filter((f) =>
    f.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const href = (family: string) =>
    `/builds/library?${new URLSearchParams({ ...query, family, weapon: "", page: "1" })}`;
  return (
    <section className="build-weapon-rail" aria-label="Weapon families">
      <div className="weapon-rail-heading">
        <h2>Weapon</h2>
        <span>Library totals</span>
      </div>
      <label className="weapon-rail-search">
        <Search size={16} />
        <span className="sr-only">Search weapon families</span>
        <input
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
          <span>All weapons</span> <small>{total.toLocaleString("en-GB")}</small>
        </Link>
        {visible.map((f) => {
          const item = weapons.find((w) => w.family === f.id)?.itemId;
          return (
            <Link
              key={f.id}
              aria-label={`Filter by ${f.name} ${f.count.toLocaleString("en-GB")}`}
              href={href(f.id)}
              aria-current={selected === f.id ? "page" : undefined}
            >
              {item ? <ItemIcon id={item} size={26} /> : <Swords size={22} />}
              <span>{f.name}</span> <small>{f.count.toLocaleString("en-GB")}</small>
            </Link>
          );
        })}
      </nav>
      {!visible.length && <p role="status">No matching family. Try axe, bow or staff.</p>}
    </section>
  );
}
