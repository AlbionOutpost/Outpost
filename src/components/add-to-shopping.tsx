"use client";
import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import Link from "@/components/link";
import { useAtlasRegion } from "./region-context";
import { mergeShopping, type ShoppingEntry } from "@/lib/albion/shopping";
import { readShopping, writeShopping } from "./shopping-storage";
import type { Region } from "@/lib/albion/region-config";
export function AddToShopping({
  entries,
  label = "Add to shopping list",
  region: sourceRegion,
}: {
  entries: ShoppingEntry[];
  label?: string;
  region?: Region;
}) {
  const selectedRegion = useAtlasRegion();
  const region = sourceRegion ?? selectedRegion;
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  return (
    <div className="shopping-add-control">
      <button
        type="button"
        className="button secondary"
        disabled={!entries.length}
        onClick={() => {
          try {
            writeShopping(mergeShopping(readShopping(region), entries, region));
            setAdded(true);
            setMessage("Added to your list. Quantities combine with existing items.");
          } catch {
            setAdded(false);
            setMessage("Your list could not be updated. Open it to check its size and saved data.");
          }
        }}
      >
        {added ? <Check size={15} /> : <ShoppingBag size={15} />} {label}
      </button>
      {message && (
        <span role="status">
          {message}{" "}
          <Link className="text-link" href={`/shopping-list?region=${region}`}>
            Open list →
          </Link>
        </span>
      )}
    </div>
  );
}
