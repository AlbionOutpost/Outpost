export function itemIconUrl(id: string, quality = 1, size = 96) {
  if (
    !/^(?:T[1-8]_[A-Z0-9_]+|(?!T\d)[A-Z][A-Z0-9_]{2,99})(?:@[1-4])?$/.test(id) ||
    id.length > 100 ||
    !Number.isInteger(quality) ||
    quality < 1 ||
    quality > 5 ||
    !Number.isInteger(size) ||
    size < 16 ||
    size > 217
  )
    throw new Error("Invalid item rendering parameters");
  return `https://render.albiononline.com/v1/item/${encodeURIComponent(id)}.png?quality=${quality}&size=${size}`;
}
