"use client";
import { useState } from "react";
import Link from "@/components/link";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { ToolIcon } from "./tool-icon";
import { useAtlasRegion } from "./region-context";
const weapons = [
  { id: "T4_MAIN_AXE", name: "Battleaxe" },
  { id: "T4_MAIN_SWORD", name: "Broadsword" },
  { id: "T4_2H_BOW", name: "Bow" },
];
/** These five unmodified official renderer PNGs are pinned in HOMEPAGE_EQUIPMENT.json. */
function ShowcaseIcon({ id, size, lead = false }: { id: string; size: number; lead?: boolean }) {
  return (
    <Image
      data-albion-icon="true"
      data-enchantment="0"
      data-quality="1"
      src={`/albion/equipment/${id}.png`}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      loading={lead ? "eager" : "lazy"}
      fetchPriority={lead ? "high" : "auto"}
    />
  );
}
/** Catalog browsing, not a recommended loadout or a claim about combat balance. */
export function HomeEquipmentShowcase() {
  const [selected, setSelected] = useState(0),
    region = useAtlasRegion();
  const weapon = weapons[selected];
  const href = (id: string) => `/items/${encodeURIComponent(id)}?region=${region}`;
  return (
    <div className="equipment-showcase" aria-label="Explore Albion equipment">
      <div className="showcase-heading">
        <span>
          <ToolIcon name="equipment" size={20} /> Find your next weapon
        </span>
        <span className="showcase-tier">T4.0</span>
      </div>
      <div className="showcase-art">
        <div className="showcase-orbit" aria-hidden="true" />
        <Link
          key={weapon.id}
          className="showcase-weapon"
          href={href(weapon.id)}
          aria-label={`Inspect ${weapon.name}`}
        >
          <ShowcaseIcon id={weapon.id} size={180} lead />
          <span>
            <strong>{weapon.name}</strong>
            <ArrowUpRight size={18} />
          </span>
        </Link>
        <Link
          className="showcase-armor showcase-cowl"
          href={href("T4_HEAD_CLOTH_SET1")}
          aria-label="Inspect Scholar Cowl"
        >
          <ShowcaseIcon id="T4_HEAD_CLOTH_SET1" size={90} />
          <span>Scholar Cowl</span>
        </Link>
        <Link
          className="showcase-armor showcase-jacket"
          href={href("T4_ARMOR_LEATHER_SET1")}
          aria-label="Inspect Mercenary Jacket"
        >
          <ShowcaseIcon id="T4_ARMOR_LEATHER_SET1" size={104} />
          <span>Mercenary Jacket</span>
        </Link>
      </div>
      <div className="showcase-choices" role="group" aria-label="Featured weapon">
        {weapons.map((w, i) => (
          <button key={w.id} onClick={() => setSelected(i)} aria-pressed={selected === i}>
            <ShowcaseIcon id={w.id} size={32} />
            {w.name}
          </button>
        ))}
      </div>
    </div>
  );
}
