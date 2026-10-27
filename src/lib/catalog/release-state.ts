/** Re-import is idempotent only while every expected row still belongs to the active release. */
export function existingReleaseState(
  expectedChecksum: string,
  actualChecksum: string,
  expectedCount: number,
  activeCount: number,
) {
  if (expectedChecksum !== actualChecksum)
    throw new Error("A catalog version is immutable; use a new version");
  if (activeCount !== expectedCount)
    throw new Error(
      "Existing catalog release is inactive or incomplete; refusing to report synchronization success. Review a new release explicitly.",
    );
  return "already-active" as const;
}
