"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import {
  caretAfter,
  clampNumber,
  formatNumberText,
  readNumberText,
  type NumberRules,
} from "@/lib/number-input";

type Value = number | string | null | undefined;

/** A prop value as a number: "", null, undefined and NaN are empty. */
function toNumber(value: Value) {
  if (value === "" || value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export type NumberFieldProps = Omit<
  ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"
> & {
  /** Controlled value; "", null, undefined or NaN show an empty field. */
  value?: Value;
  /** Uncontrolled starting value (with `name`, the plain number is what the form submits). */
  defaultValue?: Value;
  /** The plain number on every keystroke; null while the field is empty. */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Arrow keys move by this (Shift ×10). Default 1, or 0.1 with decimals. */
  step?: number;
  /** Fraction digits allowed; 0 (default) for whole numbers. */
  decimals?: number;
  /** Silver amounts: also accept 500k, 25m, 1.2m, 2b. */
  silver?: boolean;
};

/**
 * Every numeric input on the site. Shows thousands separators as you type with the caret kept in
 * place, drops leading zeros, takes the silver shorthand on silver fields, and hands the caller a
 * plain number (or null when empty, so an empty required field reads as missing, never as 0).
 * A text input with a numeric keyboard and the spinbutton role: arrow keys step, no native spinner.
 * With `name`, a hidden input carries the plain number so a form posts "1250000", not "1,250,000".
 */
export function NumberField({
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step,
  decimals = 0,
  silver = false,
  name,
  onBlur,
  onKeyDown,
  required,
  ...props
}: NumberFieldProps) {
  const rules: NumberRules = { decimals, silver, negative: min !== undefined && min < 0 };
  const controlled = value !== undefined;
  const incoming = toNumber(controlled ? value : defaultValue);
  const [text, setText] = useState(() => formatNumberText(incoming, decimals));
  const [current, setCurrent] = useState<number | null>(incoming);
  // The last number this field reported: a parent echoing it back must not reformat mid-typing.
  const [reported, setReported] = useState<number | null>(incoming);
  const [touched, setTouched] = useState(false);
  // Typed since the value last came in: only then does leaving the field tidy and clamp it, so a
  // derived value (36.70886…) shown rounded is never replaced by its rounding just by focusing.
  const [edited, setEdited] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  if (controlled && incoming !== reported && !(incoming === null && reported === null)) {
    // The parent set a new value (a preset, a reset, a loaded scenario): show it.
    setReported(incoming);
    setCurrent(incoming);
    setText(formatNumberText(incoming, decimals));
    setEdited(false);
  }
  useLayoutEffect(() => {
    if (caret.current === null || !input.current || document.activeElement !== input.current)
      return;
    input.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });
  // An uncontrolled field goes back to its starting value when its form is reset.
  const start = controlled ? null : incoming;
  useEffect(() => {
    const form = input.current?.form;
    if (controlled || !form) return;
    const reset = () => {
      setText(formatNumberText(start, decimals));
      setCurrent(start);
      setTouched(false);
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, start, decimals]);
  const emit = (next: { text: string; value: number | null }) => {
    setText(next.text);
    setCurrent(next.value);
    setReported(next.value);
    if (next.value !== current) onValueChange?.(next.value);
  };
  const stepBy = (direction: number, big: boolean) => {
    const size = (step ?? (decimals ? 10 ** -Math.min(decimals, 1) : 1)) * (big ? 10 : 1);
    const base = current ?? min ?? 0;
    const next = clampNumber(Number((base + direction * size).toFixed(decimals)), min, max);
    emit({ text: formatNumberText(next, decimals), value: next });
  };
  return (
    <>
      <input
        {...props}
        ref={input}
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        role="spinbutton"
        aria-valuenow={current ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-invalid={
          props["aria-invalid"] ?? (required && touched && current === null ? true : undefined)
        }
        required={required}
        data-number=""
        value={text}
        onChange={(event) => {
          const raw = event.target.value;
          const next = readNumberText(raw, rules);
          caret.current = caretAfter(raw, event.target.selectionStart ?? raw.length, next.text);
          setEdited(true);
          emit(next);
        }}
        onBlur={(event) => {
          if (edited) {
            const next = readNumberText(text, rules, true);
            if (next.value !== null) {
              const bounded = clampNumber(next.value, min, max);
              emit({ text: formatNumberText(bounded, decimals), value: bounded });
            } else emit({ text: "", value: null });
            setEdited(false);
          }
          setTouched(true);
          onBlur?.(event);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || props.readOnly || props.disabled) return;
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            stepBy(event.key === "ArrowUp" ? 1 : -1, event.shiftKey);
          }
        }}
      />
      {name && <input type="hidden" name={name} value={current ?? ""} />}
    </>
  );
}
