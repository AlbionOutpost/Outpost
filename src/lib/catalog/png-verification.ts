import { crc32, inflateSync } from "node:zlib";
/** Bounded validation for static 96px RGB/RGBA PNG renderer responses.
 * Unsupported encodings remain unverified. This does not identify the depicted game item.
 */
export function validRendererPng(bytes: Uint8Array): boolean {
  try {
    if (
      bytes.length > 200000 ||
      bytes.length < 57 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
    )
      return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      compressed: Uint8Array[] = [];
    let offset = 8,
      channels = 0,
      ended = false;
    while (offset < bytes.length) {
      if (offset + 12 > bytes.length) return false;
      const size = view.getUint32(offset),
        end = offset + 12 + size;
      if (end > bytes.length) return false;
      const name = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (
        crc32(bytes.subarray(offset + 4, offset + 8 + size)) !== view.getUint32(offset + 8 + size)
      )
        return false;
      if (offset === 8) {
        if (
          name !== "IHDR" ||
          size !== 13 ||
          view.getUint32(16) !== 96 ||
          view.getUint32(20) !== 96 ||
          bytes[24] !== 8 ||
          ![2, 6].includes(bytes[25]) ||
          bytes[26] !== 0 ||
          bytes[27] !== 0 ||
          bytes[28] !== 0
        )
          return false;
        channels = bytes[25] === 6 ? 4 : 3;
      } else if (name === "IHDR") return false;
      if (name === "IDAT") compressed.push(bytes.subarray(offset + 8, offset + 8 + size));
      if (name === "IEND") {
        if (size !== 0 || end !== bytes.length) return false;
        ended = true;
      }
      if (!["IHDR", "PLTE", "IDAT", "IEND"].includes(name) && /^[A-Z]/.test(name)) return false;
      offset = end;
    }
    if (!ended || !compressed.length) return false;
    const stride = 1 + 96 * channels,
      raw = inflateSync(Buffer.concat(compressed), { maxOutputLength: 96 * stride });
    return (
      raw.length === 96 * stride &&
      Array.from({ length: 96 }, (_, row) => raw[row * stride]).every((filter) => filter <= 4)
    );
  } catch {
    return false;
  }
}
