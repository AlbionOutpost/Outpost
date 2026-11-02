"use client";
import { useLayoutEffect, useRef } from "react";
/** Visual interpolation only. Assistive technology and data-value always receive the actual target. */
export function AnimatedNumber({
  value,
  digits = 0,
  suffix = "",
  signed = false,
}: {
  value: number;
  digits?: number;
  suffix?: string;
  signed?: boolean;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const current = useRef(value);
  const text = `${signed && value >= 0 ? "+" : ""}${value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}${suffix}`;
  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    let frame = 0;
    const from = current.current;
    const format = (n: number) =>
      `${signed && n >= 0 ? "+" : ""}${n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}${suffix}`;
    if (
      from === value ||
      !Number.isFinite(value) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      current.current = value;
      element.textContent = format(value);
      return;
    }
    const start = performance.now();
    element.textContent = format(from);
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / 380);
      current.current = from + (value - from) * (1 - (1 - progress) ** 3);
      element.textContent = format(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        current.current = value;
        element.textContent = format(value);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, digits, suffix, signed]);
  return (
    <span className="animated-number" role="group" aria-label={text} data-value={value}>
      <span ref={node} aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
