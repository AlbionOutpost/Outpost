/** A silver amount with the game's coin, as every price in Albion is shown. */
export function Silver({
  value,
  plain = "—",
}: {
  value: number | null | undefined;
  plain?: string;
}) {
  if (value == null) return <>{plain}</>;
  return (
    <span className="silver">
      {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
      <img src="/albion/icons/silver.webp" alt="" width={16} height={16} />
      {Math.round(value).toLocaleString("en-US")}
    </span>
  );
}
export const compact = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(2)}m`
    : v >= 10_000
      ? `${Math.round(v / 1000)}k`
      : Math.round(v).toLocaleString("en-US");
