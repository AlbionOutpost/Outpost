import manifest from "./image-variants.json";

const variants: Record<
  string,
  { width: number; height: number; hash: string; variants: number[] }
> = manifest;

/**
 * The `srcset` for a local image that `scripts/image-variants.mjs` wrote narrower copies of
 * ({name}-{width}w.webp beside it), with the source as the widest candidate; undefined for any
 * other image, which then loads as it is.
 */
export function variantSrcSet(src: string): string | undefined {
  const entry = variants[src];
  if (!entry?.variants.length) return undefined;
  return [
    ...entry.variants.map((w) => `${src.replace(/\.\w+$/, `-${w}w.webp`)} ${w}w`),
    `${src} ${entry.width}w`,
  ].join(", ");
}

/** The intrinsic size of a listed image, for its `width` and `height` attributes. */
export const variantSize = (src: string) => {
  const entry = variants[src];
  return entry ? { width: entry.width, height: entry.height } : undefined;
};

/** The narrowest file of a listed image (the source itself when it has no variants), for art
 * drawn blurred, where the extra pixels are never seen. */
export const smallestVariant = (src: string) => {
  const width = variants[src]?.variants[0];
  return width ? src.replace(/\.\w+$/, `-${width}w.webp`) : src;
};
