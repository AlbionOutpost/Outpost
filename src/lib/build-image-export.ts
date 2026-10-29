import { inventoryLayout } from "./build-inventory-layout";
export type BuildImageEquipment = {
  slot: string;
  itemId: string;
  quality: number;
  name: string;
  qualityNote?: string;
};

/** User-triggered browser rendering. Only bounded item-art reads leave the browser; the plan is never uploaded. */
export async function exportBuildImage(title: string, equipment: BuildImageEquipment[]) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas"),
    artwork = new Map<string, ImageBitmap>();
  canvas.width = 900;
  canvas.height = 1120;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable in this browser.");
  let missing = 0;
  try {
    const unique = [
      ...new Map(equipment.slice(0, 10).map((e) => [`${e.itemId}:${e.quality}`, e])).entries(),
    ];
    for (let i = 0; i < unique.length; i += 4)
      await Promise.all(
        unique.slice(i, i + 4).map(async ([key, item]) => {
          try {
            const response = await fetch(
              `/api/item-icon?${new URLSearchParams({ id: item.itemId, quality: String(item.quality) })}`,
              { signal: AbortSignal.timeout(5000) },
            );
            if (!response.ok || response.headers.get("X-Icon-Status") !== "available")
              throw new Error();
            artwork.set(key, await createImageBitmap(await response.blob()));
          } catch {
            missing++;
          }
        }),
      );
    const style = getComputedStyle(document.querySelector(".app") || document.body),
      font = style.getPropertyValue("--font-ui") || "sans-serif";
    const fit = (text: string, width: number) => {
      let value = text;
      while (ctx.measureText(value).width > width && value.length) value = value.slice(0, -1);
      return value === text ? value : value.slice(0, -1) + "…";
    };
    ctx.fillStyle = "#0b1016";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f9733a";
    ctx.font = `700 26px ${font}`;
    ctx.fillText("OUTPOST", 42, 50);
    ctx.fillStyle = "#f1f5f9";
    ctx.font = `700 32px ${font}`;
    ctx.fillText(fit(title, 816), 42, 104);
    ctx.fillStyle = "#a8b4c0";
    ctx.font = `16px ${font}`;
    ctx.fillText(`${equipment.length}/10 equipped · Equipment plan`, 42, 138);
    const qualityNames = ["", "Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
    for (const place of inventoryLayout) {
      const x = 94 + place.column * 250,
        y = 175 + place.row * 215,
        item = equipment.find((e) => e.slot === place.slot);
      ctx.fillStyle = "#101922";
      ctx.fillRect(x, y, 210, 194);
      ctx.strokeStyle = "#263542";
      ctx.strokeRect(x + 0.5, y + 0.5, 209, 193);
      ctx.fillStyle = "#a8b4c0";
      ctx.font = `600 15px ${font}`;
      ctx.fillText(place.slot, x + 14, y + 25);
      if (item) {
        const image = artwork.get(`${item.itemId}:${item.quality}`);
        if (image) ctx.drawImage(image, x + 55, y + 35, 100, 100);
        else {
          ctx.fillStyle = "#7d8b99";
          ctx.font = `14px ${font}`;
          ctx.fillText("Artwork unavailable", x + 20, y + 86);
        }
        ctx.fillStyle = "#f1f5f9";
        ctx.font = `600 13px ${font}`;
        ctx.fillText(fit(item.name, 182), x + 14, y + 155);
        ctx.fillStyle = "#a8b4c0";
        ctx.font = `12px ${font}`;
        ctx.fillText(
          fit(item.qualityNote || qualityNames[item.quality] || "Quality unknown", 182),
          x + 14,
          y + 177,
        );
      } else {
        ctx.strokeStyle = "#7d8b99";
        ctx.beginPath();
        ctx.moveTo(x + 96, y + 77);
        ctx.lineTo(x + 114, y + 95);
        ctx.moveTo(x + 114, y + 77);
        ctx.lineTo(x + 96, y + 95);
        ctx.stroke();
        ctx.fillStyle = "#7d8b99";
        ctx.font = `13px ${font}`;
        ctx.fillText("Empty", x + 84, y + 157);
      }
    }
    ctx.fillStyle = "#a8b4c0";
    ctx.font = `12px ${font}`;
    ctx.fillText(
      "Item artwork © Sandbox Interactive · No market values or combat-stat estimates",
      42,
      1090,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error("PNG encoding failed. Please retry.")),
        "image/png",
      ),
    );
    return { blob, missing };
  } finally {
    artwork.forEach((image) => image.close());
  }
}
