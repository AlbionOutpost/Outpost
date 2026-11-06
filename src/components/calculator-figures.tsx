import { Silver } from "./silver";
import { Unavailable } from "./status-line";
import { sourceAge } from "@/lib/albion/source-age";
import s from "@/app/production-calculator.module.css";

/** Silver with the coin, or "— Unavailable" when the figure is missing. */
export const coin = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? (
    <Unavailable />
  ) : (
    <Silver value={v} digits={2} />
  );

/** Gain, loss or even, for ResultFigure, ResultRows and the phone summary bar. */
export const profitTone = (v: number | null | undefined) =>
  v == null || v === 0 ? ("even" as const) : v > 0 ? ("gain" as const) : ("loss" as const);

/** "Gain", "Loss" or "Break-even", spelled out next to a coloured figure. */
export const profitWord = (v: number | null | undefined) =>
  v == null ? "Unavailable" : v > 0 ? "Gain" : v < 0 ? "Loss" : "Break-even";

/** A source observation's age, with its exact UTC time kept on the element; Stale past an hour. */
export function Observed({ at }: { at: string }) {
  const age = sourceAge(at);
  const exact = `${at.replace("T", " ").slice(0, 16)} UTC`;
  return (
    <>
      <time dateTime={at} title={exact}>
        {age.label}
        <span className="sr-only"> ({exact})</span>
      </time>
      {age.stale && <span className={`${s.chip} ${s.stale}`}>Stale</span>}
    </>
  );
}

/** A Manual chip, the observation's age, or "— Unavailable". */
export function PriceSource({
  manual,
  observedAt,
  city,
  pending,
}: {
  manual: boolean;
  observedAt: string | null | undefined;
  city?: string | null;
  pending?: boolean;
}) {
  if (manual) return <span className={s.chip}>Manual</span>;
  if (observedAt)
    return (
      <>
        {city && `${city} · `}
        <Observed at={observedAt} />
      </>
    );
  return pending ? <>Loading price…</> : <Unavailable />;
}
