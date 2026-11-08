"use client";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import styles from "./teams.module.css";

const still = () =>
  typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The most a crest leans toward the pointer, in degrees. */
const lean = 18;

/** A few sparks flying out of the crest's middle, removed when they land. */
function sparkle(host: HTMLElement, count: number) {
  for (let i = 0; i < count; i++) {
    const spark = document.createElement("span");
    spark.className = styles.spark;
    spark.setAttribute("aria-hidden", "true");
    host.append(spark);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const reach = 30 + Math.random() * 26;
    const x = Math.cos(angle) * reach,
      y = Math.sin(angle) * reach;
    spark
      .animate(
        [
          { transform: "translate(-50%, -50%) scale(0.2)", opacity: 1 },
          {
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`,
            opacity: 1,
            offset: 0.6,
          },
          {
            transform: `translate(calc(-50% + ${x * 1.2}px), calc(-50% + ${y * 1.2 + 10}px)) scale(0.3)`,
            opacity: 0,
          },
        ],
        { duration: 620 + Math.random() * 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      )
      .finished.finally(() => spark.remove());
  }
}

/**
 * Makes a team crest playful: it leans toward the pointer in 3D with a shine that follows it,
 * lifts while hovered, and a click strikes it down with a bounce and sparks; a tap wobbles it.
 * Decorative only (the crest stays aria-hidden), so it adds no tab stop. Reduced motion keeps
 * the crest still. CSS 3D transforms and Web Animations only; nothing re-renders while it moves.
 */
export function LivelyCrest({ children }: { children: ReactNode }) {
  const host = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const set = (rx: number, ry: number, sx: number, sy: number) => {
    const el = host.current;
    if (!el) return;
    el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    el.style.setProperty("--sx", `${sx.toFixed(1)}%`);
    el.style.setProperty("--sy", `${sy.toFixed(1)}%`);
  };
  const move = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch" || still()) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1),
      y = Math.min(Math.max((event.clientY - box.top) / box.height, 0), 1);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() =>
      set((0.5 - y) * 2 * lean, (x - 0.5) * 2 * lean, x * 100, y * 100),
    );
  };
  const mark = () => host.current?.firstElementChild as HTMLElement | null;
  // On a directory card the crest sits above the card's link: open the team like the link would.
  const open = (event: PointerEvent<HTMLSpanElement>) => {
    const link = host.current
      ?.closest("[data-team-card]")
      ?.querySelector<HTMLAnchorElement>("a[href]");
    if (!link) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey)
      window.open(link.href, "_blank", "noopener");
    else link.click();
  };
  const strike = (event: PointerEvent<HTMLSpanElement>) => {
    const el = host.current,
      crest = mark();
    // Only a plain primary press: right and middle buttons keep their own meaning.
    if (!el || !crest || event.button !== 0) return;
    if (still()) {
      open(event);
      return;
    }
    if (event.pointerType === "touch") {
      crest.animate(
        [
          { rotate: "0deg" },
          { rotate: "-7deg", offset: 0.2 },
          { rotate: "6deg", offset: 0.45 },
          { rotate: "-3deg", offset: 0.7 },
          { rotate: "0deg" },
        ],
        { duration: 560, easing: "ease-out" },
      );
      sparkle(el, 6);
      window.setTimeout(() => open(event), 260);
      return;
    }
    window.setTimeout(() => open(event), 260);
    crest.animate(
      [
        { scale: "1" },
        { scale: "0.86", offset: 0.18 },
        { scale: "1.14", offset: 0.5 },
        { scale: "0.97", offset: 0.75 },
        { scale: "1" },
      ],
      { duration: 520, easing: "cubic-bezier(0.34, 1.36, 0.64, 1)" },
    );
    sparkle(el, 10);
  };
  return (
    <span
      ref={host}
      className={styles.lively}
      onPointerEnter={(e) =>
        e.pointerType !== "touch" && !still() && e.currentTarget.setAttribute("data-hover", "")
      }
      onPointerMove={move}
      onPointerLeave={(e) => {
        cancelAnimationFrame(frame.current);
        e.currentTarget.removeAttribute("data-hover");
        set(0, 0, 50, 30);
      }}
      onPointerUp={strike}
    >
      {children}
    </span>
  );
}

/**
 * The previous and current value of a crest part, so the old one can flip away while the new one
 * lands. `leaving` clears itself when its exit animation ends (reduced motion hides it at once).
 */
export function useSwap<T>(value: T) {
  const [current, setCurrent] = useState(value);
  const [leaving, setLeaving] = useState<T | null>(null);
  // How many times it changed: keys the layers, and 0 means nothing animates on first paint.
  const [version, setVersion] = useState(0);
  if (!Object.is(value, current)) {
    setLeaving(current);
    setCurrent(value);
    setVersion(version + 1);
  }
  return { current, leaving, version, done: () => setLeaving(null) };
}

const url = (kind: "crests" | "charges", name: string) =>
  `url("/albion/${kind}/${kind === "crests" ? `crest-${name}` : name}.webp")`;

/**
 * The crest picker's preview: a new shield flips in as the old one turns away, and a new symbol
 * lands on it while the old one lifts off. Same size and art as the 88px `TeamMark`.
 */
export function SwapCrest({ color, charge }: { color: string; charge: string }) {
  const shield = useSwap(color),
    symbol = useSwap(charge);
  return (
    <span className={styles.swapCrest} aria-hidden="true" data-team-crest={symbol.current}>
      {shield.leaving !== null && (
        <span
          key={`out-${shield.version}`}
          className={styles.swapShield}
          data-leaving=""
          style={{ "--shield": url("crests", shield.leaving) } as React.CSSProperties}
          onAnimationEnd={shield.done}
        />
      )}
      <span
        key={`in-${shield.version}`}
        className={styles.swapShield}
        data-entering={shield.version ? "" : undefined}
        style={{ "--shield": url("crests", shield.current) } as React.CSSProperties}
      />
      {symbol.leaving !== null && (
        <span
          key={`out-${symbol.version}`}
          className={styles.swapCharge}
          data-leaving=""
          style={{ "--charge": url("charges", symbol.leaving) } as React.CSSProperties}
          onAnimationEnd={symbol.done}
        />
      )}
      <span
        key={`in-${symbol.version}`}
        className={styles.swapCharge}
        data-entering={symbol.version ? "" : undefined}
        style={{ "--charge": url("charges", symbol.current) } as React.CSSProperties}
      />
    </span>
  );
}
