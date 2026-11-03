"use client";
import { useLayoutEffect, useRef } from "react";

/** Only changed digits roll. Accessible text and data-value always expose the final amount. */
export function AnimatedNumber({
  value,
  digits = 0,
  suffix = "",
  signed = false,
  minimumDigits = digits,
}: {
  value: number;
  digits?: number;
  suffix?: string;
  signed?: boolean;
  minimumDigits?: number;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef({ value, text: "" });
  const text = `${signed && value >= 0 ? "+" : ""}${value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: minimumDigits })}${suffix}`;
  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const old = previous.current;
    previous.current = { value, text };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (!old.text || old.text === text || !Number.isFinite(value) || motion.matches) {
      element.textContent = text;
      return;
    }
    const animations: Animation[] = [];
    const direction = value >= old.value ? 1 : -1;
    // Align integer places from the decimal point so 999→1,000 preserves digit identity.
    const parts = (str: string) => {
      const decimal = str.indexOf(".");
      const end = decimal < 0 ? str.search(/[^\d,](?!.*\d)/) : decimal;
      const integerEnd = end < 0 ? str.length : end;
      let place = [...str.slice(0, integerEnd)].filter((c) => /\d/.test(c)).length;
      let fraction = 0;
      return [...str].map((char, i) => ({
        char,
        key: /\d/.test(char) ? (i < integerEnd ? `i${--place}` : `f${fraction++}`) : null,
      }));
    };
    const prior = new Map(
      parts(old.text)
        .filter((p) => p.key)
        .map((p) => [p.key, p.char]),
    );
    const fragment = document.createDocumentFragment();
    for (const { char, key } of parts(text)) {
      const before = key ? prior.get(key) : undefined;
      if (!key || before === char) {
        fragment.append(char);
        continue;
      }
      const cell = document.createElement("span");
      cell.className = "number-digit";
      const wheel = document.createElement("span");
      wheel.className = "number-wheel";
      wheel.textContent = char;
      wheel.dataset.previous = before ?? "";
      wheel.style.setProperty("--previous-offset", `${-direction * 100}%`);
      cell.append(wheel);
      fragment.append(cell);
      animations.push(
        wheel.animate(
          [{ transform: `translateY(${direction * 100}%)` }, { transform: "translateY(0)" }],
          { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        ),
      );
    }
    element.replaceChildren(fragment);
    const settle = () => {
      for (const animation of animations) animation.finish();
    };
    motion.addEventListener("change", settle);
    return () => {
      motion.removeEventListener("change", settle);
      for (const animation of animations) animation.cancel();
    };
  }, [value, text]);
  return (
    <span className="animated-number" role="group" aria-label={text} data-value={value}>
      <span ref={node} aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
