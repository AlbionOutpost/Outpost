"use client";
import { useCallback, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { PanelHead } from "./panel-head";
import styles from "./calculator-shell.module.css";

export type CalculatorStep = {
  /** The panel's id: focus and scroll target when the step opens. */
  id: string;
  /** Short name in the phone step switcher ("Price materials"). */
  label: string;
  /** Panel title (Barlow, numbered). */
  title: ReactNode;
  line?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * The step state of a calculator: which panel the phone switcher shows. Opening a step moves
 * focus to its panel and, on phones, scrolls the switcher back into view.
 */
export function useCalculatorStep(ids: string[]) {
  const [step, setStep] = useState(1);
  const key = ids.join("|");
  const go = useCallback(
    (next: number) => {
      setStep(next);
      requestAnimationFrame(() => {
        const panel = document.getElementById(key.split("|")[next - 1]);
        panel?.focus({ preventScroll: true });
        if (matchMedia("(max-width: 780px)").matches)
          panel
            ?.closest(`.${styles.shell}`)
            ?.querySelector(`.${styles.switcher}`)
            ?.scrollIntoView({ block: "start" });
      });
    },
    [key],
  );
  return [step, go] as const;
}

/**
 * The one calculator layout: numbered input panels, then the result. Wide screens show every
 * step side by side with the result last; tablets stack the inputs beside a sticky result; phones
 * show one step at a time behind a switcher, with the headline figure (`summary`) pinned to the
 * bottom of the screen until the result step is open. An optional `rail` (a list to pick from)
 * sits first on wide screens and above the steps elsewhere.
 */
export function CalculatorShell({
  label,
  steps,
  step,
  onStep,
  summary,
  rail,
}: {
  /** Names the step switcher, e.g. "Crafting workflow". */
  label: string;
  /** Input steps first; the last step is the result. */
  steps: CalculatorStep[];
  step: number;
  onStep: (step: number) => void;
  /** The headline result for the phone summary bar: a label and a figure. */
  summary?: { label: string; value: ReactNode; tone?: "gain" | "loss" | "even" };
  rail?: ReactNode;
}) {
  const last = steps.length;
  return (
    <div className={styles.shell} data-rail={rail ? "" : undefined}>
      <nav className={styles.switcher} aria-label={label}>
        {steps.map((s, i) => (
          <button
            type="button"
            key={s.id}
            aria-current={step === i + 1 ? "step" : undefined}
            onClick={() => onStep(i + 1)}
          >
            <span>{i + 1}</span> {s.label}
          </button>
        ))}
      </nav>
      <div className={styles.grid} style={{ "--inputs": last - 1 } as React.CSSProperties}>
        {rail && <div className={styles.rail}>{rail}</div>}
        {steps.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            tabIndex={-1}
            aria-labelledby={`${s.id}-title`}
            className={`panel ${styles.panel} ${i + 1 === last ? styles.result : ""}`}
            data-active={step === i + 1 ? "" : undefined}
          >
            <div className={styles.head}>
              <PanelHead id={`${s.id}-title`} step={i + 1} title={s.title} line={s.line} />
              {s.actions}
            </div>
            {s.children}
            {i + 1 < last && (
              <button
                type="button"
                className={`button primary ${styles.next}`}
                onClick={() => onStep(i + 2)}
              >
                {i + 2 === last
                  ? steps[last - 1].label
                  : `Next: ${steps[i + 1].label.toLowerCase()}`}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </section>
        ))}
      </div>
      {summary && step !== last && (
        <div className={styles.summary} data-tone={summary.tone}>
          <span>
            <small>{summary.label}</small>
            <b>{summary.value}</b>
          </span>
          <button type="button" className="button secondary" onClick={() => onStep(last)}>
            See result
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/** The headline result: a large figure in the gain/loss colour with its word spelled out. */
export function ResultFigure({
  label,
  value,
  note,
  tone = "even",
  aside,
}: {
  label: string;
  value: ReactNode;
  /** "Gain · silver for 10 outputs" */
  note?: ReactNode;
  tone?: "gain" | "loss" | "even";
  /** A second, smaller figure on the right (margin). */
  aside?: { label: string; value: ReactNode };
}) {
  return (
    <div className={styles.figure} data-tone={tone} aria-live="polite">
      <span>
        <small>{label}</small>
        <b>{value}</b>
        {note && <small>{note}</small>}
      </span>
      {aside && (
        <span className={styles.aside}>
          <small>{aside.label}</small>
          <b>{aside.value}</b>
        </span>
      )}
    </div>
  );
}

/** Two figures side by side in one well: what you pay against what you get. */
export function ResultPair({
  items,
  result,
}: {
  items: { label: ReactNode; value: ReactNode }[];
  /** A `data-result` hook for tests and analytics. */
  result?: string;
}) {
  return (
    <dl className={styles.pair} data-result={result}>
      {items.map((item, i) => (
        <div key={i}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Supporting figures as label/value rows in a well. */
export function ResultRows({
  items,
  result,
}: {
  items: { label: ReactNode; value: ReactNode; tone?: "gain" | "loss" | "even" }[];
  result?: string;
}) {
  return (
    <dl className={styles.rows} data-result={result}>
      {items.map((item, i) => (
        <div key={i} data-tone={item.tone}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
