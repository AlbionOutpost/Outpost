"use client";
import Image from "next/image";
import { useState } from "react";
export function SpellIcon({ id, name, size = 32 }: { id: string; name: string; size?: number }) {
  const [failed, setFailed] = useState("");
  if (!/^[A-Z0-9_]{2,100}$/.test(id) || failed === id)
    return (
      <span
        data-albion-spell-id={id}
        className="spell-icon-unavailable"
        title={`${name}: icon unavailable`}
        aria-hidden="true"
      >
        ?
      </span>
    );
  return (
    <Image
      unoptimized
      src={`https://render.albiononline.com/v1/spell/${encodeURIComponent(id)}.png?size=64`}
      width={size}
      height={size}
      alt=""
      data-albion-spell="true"
      data-albion-spell-id={id}
      onError={() => setFailed(id)}
    />
  );
}
